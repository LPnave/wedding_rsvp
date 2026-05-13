import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// ── Template download ────────────────────────────────────────────────────────
export async function GET() {
  const csv = [
    "family_name,side,guest_name",
    "Silva Family,groom,John Silva",
    "Silva Family,groom,Jane Silva",
    "Perera Family,bride,Inoka Perera",
  ].join("\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="import-template.csv"',
    },
  })
}

// ── Bulk import ──────────────────────────────────────────────────────────────
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

async function insertInvite(family_name: string, side: string): Promise<{ id: number; code: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    try {
      const result = await db.execute({
        sql: "INSERT INTO invites (code, family_name, max_guests, side) VALUES (?, ?, 1, ?)",
        args: [code, family_name, side],
      })
      return { id: Number(result.lastInsertRowid), code }
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes("UNIQUE")) continue
      throw err
    }
  }
  throw new Error("Failed to generate unique code")
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row." }, { status: 400 })
    }

    // Parse header — case-insensitive, trimmed
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const col = (name: string) => header.indexOf(name)

    const familyCol = col("family_name")
    const sideCol   = col("side")
    const guestCol  = col("guest_name")

    if (familyCol === -1 || sideCol === -1) {
      return NextResponse.json({ error: "CSV must contain columns: family_name, side. guest_name is optional." }, { status: 400 })
    }

    type Row = { family_name: string; side: string; guest_name: string }
    const rows: Row[] = []
    const parseErrors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
      const family_name = cols[familyCol]?.trim()
      const side        = cols[sideCol]?.trim().toLowerCase()
      const guest_name  = guestCol !== -1 ? cols[guestCol]?.trim() : ""

      if (!family_name) { parseErrors.push(`Row ${i + 1}: missing family_name`); continue }
      if (side !== "groom" && side !== "bride") { parseErrors.push(`Row ${i + 1}: side must be "groom" or "bride" (got "${side}")`); continue }

      rows.push({ family_name, side, guest_name: guest_name ?? "" })
    }

    if (parseErrors.length > 0 && rows.length === 0) {
      return NextResponse.json({ error: "All rows failed validation.", details: parseErrors }, { status: 400 })
    }

    // Group rows by family_name+side to merge guests under one invite
    const familyMap = new Map<string, { family_name: string; side: string; guests: string[] }>()
    for (const row of rows) {
      const key = `${row.family_name}__${row.side}`
      if (!familyMap.has(key)) familyMap.set(key, { family_name: row.family_name, side: row.side, guests: [] })
      if (row.guest_name) familyMap.get(key)!.guests.push(row.guest_name)
    }

    let invitesCreated = 0
    let guestsCreated  = 0
    let skipped        = 0

    for (const { family_name, side, guests } of familyMap.values()) {
      // Skip if an invite with this exact family_name already exists
      const existing = await db.execute({
        sql: "SELECT id FROM invites WHERE family_name = ?",
        args: [family_name],
      })
      if (existing.rows.length > 0) { skipped++; continue }

      const { id: inviteId } = await insertInvite(family_name, side)
      invitesCreated++

      // Update max_guests to reflect actual guest count
      const guestCount = guests.length || 1
      await db.execute({
        sql: "UPDATE invites SET max_guests = ? WHERE id = ?",
        args: [guestCount, inviteId],
      })

      for (const name of guests) {
        await db.execute({
          sql: "INSERT INTO guests (invite_id, name) VALUES (?, ?)",
          args: [inviteId, name],
        })
        guestsCreated++
      }
    }

    return NextResponse.json({
      success: true,
      invites_created: invitesCreated,
      guests_created: guestsCreated,
      skipped,
      parse_errors: parseErrors,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}
