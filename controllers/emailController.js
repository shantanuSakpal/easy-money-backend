const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const Handlebars = require("handlebars");
require("dotenv").config();

const sendInvoiceEmail = async (req, res) => {
  let browser;
  try {
    const {
      recipient = {},
      payer = {},
      note = "No additional notes.",
      transactionLink = "N/A",
      emailBody = "Hello $name, your invoice is attached.",
    } = req.body;

    // Calculate net pay (fallback to "0" if fields are missing)
    const amount = Number(recipient.amount || 0);
    const deductions = Number(recipient.deductions || 0);
    const netPay = (amount - deductions).toFixed(4);

    // Invoice data with fallbacks
    const invoiceData = {
      recipientName:
        `${recipient.firstName || ""} ${recipient.lastName || ""}`.trim() ||
        recipient.name ||
        "N/A",
      recipientBusinessName: recipient.businessName || "N/A",
      recipientEmail: recipient.email || "N/A",
      recipientWalletAddress: recipient.walletAddress || "N/A",
      recipientPhone: recipient.phone || "Not provided",
      payerBusinessName: payer.businessName || "N/A",
      payerEmail: payer.email || "N/A",
      payerPhone: payer.phone || "Not provided",
      payerWalletAddress: payer.walletAddress || "N/A",
      note,
      currentDate: new Date().toLocaleDateString(),
      invoiceNumber: recipient.invoiceNumber, // Generate unique invoice number
      transactionLink,
      netPay,
      amount: amount.toFixed(4),
      deductions: deductions.toFixed(4),
    };

    // Interpolate email body with recipient and payer data
    const interpolateVariables = (text, data) =>
      text.replace(/\$(\w+)/g, (_, key) => data[key] || `$${key}`);

    const interpolatedEmailBody = interpolateVariables(emailBody, {
      name: invoiceData.recipientName,
      walletAddress: invoiceData.recipientWalletAddress,
      businessName: invoiceData.payerBusinessName,
      amount: invoiceData.amount,
      netPay: invoiceData.netPay,
    });

    // Read and compile the invoice template
    const templatePath = path.join(__dirname, "invoice-template.html");
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(templateSource);
    const htmlContent = template(invoiceData);

    // Setup directory for invoices
    const invoicesDir = path.join(__dirname, "invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir);
    }

    // Generate PDF with Puppeteer
    // browser = await puppeteer.launch({
    //   headless: "new",
    //   args: ["--no-sandbox"],
    // });

    browser = await puppeteer.launch({
      executablePath: "/opt/render/.cache/puppeteer/chrome-linux/chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const filename = `Invoice-${invoiceData.invoiceNumber}.pdf`;
    const filepath = path.join(invoicesDir, filename);

    await page.pdf({
      path: filepath,
      format: "A4",
      margin: {
        top: "40px",
        right: "40px",
        bottom: "40px",
        left: "40px",
      },
      printBackground: true,
    });

    await browser.close();
    browser = null;

    // Send email with attachment
    await sendEmailWithAttachment({
      to: recipient.email || payer.email, // Fallback to payer email if recipient email is not provided
      subject: `Invoice for ${invoiceData.payerBusinessName}`,
      text: interpolatedEmailBody,
      filepath,
    });

    // Cleanup file
    fs.unlinkSync(filepath);

    res.status(200).json({
      message: "success",
      invoiceNumber: invoiceData.invoiceNumber,
    });
  } catch (error) {
    console.error("Error in sendInvoiceEmail:", error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({
      message: "Failed to send invoice",
      error: error.message,
    });
  }
};

async function sendEmailWithAttachment({ to, subject, text, filepath }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      attachments: [
        {
          filename: path.basename(filepath),
          path: filepath,
        },
      ],
    });

    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
}

module.exports = { sendInvoiceEmail };
