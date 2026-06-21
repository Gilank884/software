import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, galleryUrl } = await req.json()

    const { data, error } = await resend.emails.send({
      from: "Latarcerita Photobooth <photo@latarcerita.com>",
      to: [email],
      subject: "Foto kamu dari Latarcerita Photobooth sudah siap! 📸",
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #334155; background: #f8fafc; padding: 40px 20px;">
          <div style="background: white; border-radius: 20px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
            <h1 style="text-align: center; color: #1e293b; font-size: 24px; margin: 0 0 8px;">Kenangan kamu sudah siap! 🎉</h1>
            <p style="text-align: center; color: #64748b; font-size: 14px; margin: 0 0 32px;">Klik tombol di bawah untuk melihat dan mengunduh fotomu.</p>
            <div style="text-align: center; margin: 0 0 32px;">
              <a href="${galleryUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 12px; letter-spacing: 0.02em;">
                Lihat Foto Saya →
              </a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">Atau salin link ini:<br/><a href="${galleryUrl}" style="color: #2563eb; word-break: break-all;">${galleryUrl}</a></p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            <p style="font-size: 11px; color: #cbd5e1; text-align: center; margin: 0;">&copy; 2026 Latarcerita. All rights reserved.</p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Resend Error:', error)
      return new Response(JSON.stringify({ error: error.message, details: error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function Error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
