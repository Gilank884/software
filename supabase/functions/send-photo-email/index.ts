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
    const { email, photoUrl, userName } = await req.json()

    const { data, error } = await resend.emails.send({
      from: "Latarcerita Photobooth <photo@latarcerita.com>",
      to: [email],
      subject: "Your Photobooth Capture is Here! 📸",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
          <h1 style="text-align: center; color: #1e293b;">Captured a Moment!</h1>
          <p style="font-size: 16px; line-height: 1.6;">Hi there,</p>
          <p style="font-size: 16px; line-height: 1.6;">Thank you for using Latarcerita Photobooth. Here is your digital copy of the memories you just captured.</p>
          <div style="text-align: center; margin: 40px 0;">
            <img src="${photoUrl}" alt="Photobooth Capture" style="max-width: 100%; border-radius: 12px; shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);" />
          </div>
          <p style="font-size: 14px; color: #64748b; text-align: center;">If you can't see the image, <a href="${photoUrl}" style="color: #2563eb; text-decoration: none; font-weight: bold;">click here to download</a>.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 40px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 Latarcerita. All rights reserved.</p>
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
