import { Resend } from "resend";
import { ENV } from "./env";

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    if (!ENV.resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resend = new Resend(ENV.resendApiKey);
  }
  return resend;
}

export interface SendMagicLinkEmailParams {
  to: string;
  magicLink: string;
  appName?: string;
}

export async function sendMagicLinkEmail({
  to,
  magicLink,
  appName = "Property Manager Pro",
}: SendMagicLinkEmailParams) {
  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: ENV.emailFrom,
      to: [to],
      subject: `Sign in to ${appName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign in to ${appName}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Sign in to ${appName}</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello!</p>
              
              <p style="font-size: 16px; margin-bottom: 30px;">
                Click the button below to sign in to your account. This link will expire in 15 minutes.
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${magicLink}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 14px 40px; 
                          text-decoration: none; 
                          border-radius: 6px; 
                          font-weight: 600;
                          font-size: 16px;
                          display: inline-block;
                          box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);">
                  Sign In
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 14px; color: #667eea; word-break: break-all; background: #f7f7f7; padding: 12px; border-radius: 4px;">
                ${magicLink}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="font-size: 13px; color: #999; margin: 0;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
Sign in to ${appName}

Click the link below to sign in to your account. This link will expire in 15 minutes.

${magicLink}

If you didn't request this email, you can safely ignore it.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
      `.trim(),
    });

    if (error) {
      console.error("[Email] Failed to send magic link:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("[Email] Magic link sent successfully:", data?.id);
    return data;
  } catch (error) {
    console.error("[Email] Error sending magic link:", error);
    throw error;
  }
}
