import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config()





const resend = new Resend(process.env.RESEND_API_KEY as string)


export const sendVerificationEmail = async (email: string, code: string) : Promise<{ success: boolean; message: string }> => {
    try {
        const response = await resend.emails.send({
            from: "divya@oldiesilex.resend.app",
            to: [email],
            subject: "Your Verification Code - Early Warning System",
           html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #FF6B35;">Verification Code</h2>
          <p>Hello,</p>
          <p>Your 6-digit verification code is: <strong style="font-size: 24px; color: #2C3E50;">${code}</strong></p>
          <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
          <p>Best,<br>Technical Education Department, Rajasthan</p>
        </div>
      `,
    })

    if (!response) {
        console.error('Email Service Error: ',response);
        return { success: false, message: "Failed to send verification email." };
    }


     console.log(response);
     console.log('Email sent successfully',code);
     return { success: true, message: "Verification email sent successfully." };
    } catch (error: any) {
        console.error('Email Service Error: ',error);
        return { success: false, message: "Failed to send verification email." };
    }
}
