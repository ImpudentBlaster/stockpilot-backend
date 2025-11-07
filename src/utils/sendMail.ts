import nodemailer from "nodemailer";

export const sendMail = async ({ emails }: { emails: string[] }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: "sagarsharma.techies@gmail.com",
      to: emails,
      subject: "Testing nodemailer",
      text: `Test`,
      html: `
        <p>Testing nodemailer</p>
      `,
    });

    console.log(`Sent email to: [${emails.join(", ")}]`);
  } catch (error: any) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
