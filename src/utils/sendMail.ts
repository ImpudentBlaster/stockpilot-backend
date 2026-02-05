import nodemailer from "nodemailer";

export const sendMail = async ({
  email,
  variant_id,
}: {
  email: string;
  variant_id: string;
}) => {
  console.log("EMAIL VALUES:", email, variant_id);
  console.log("EMAIL CREDS:", process.env.SMTP_HOST);
  console.log("EMAIL CREDS:", process.env.SMTP_PORT);
  console.log("EMAIL CREDS:", process.env.SMTP_USER);
  console.log("EMAIL CREDS:", process.env.SMTP_PASS);
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
      to: email,
      subject: "Testing nodemailer",
      text: `Test`,
      html: `
        <p>Product with id: ${variant_id} is now in stock</p>
      `,
    });

    console.log(`Sent email to: ${email}`);
  } catch (error: any) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
