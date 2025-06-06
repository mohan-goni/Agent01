import { Resend } from "resend"

const resend = new Resend(process.env.EMAIL_SERVICE_API_KEY!)

export class EmailService {
  async sendWelcomeEmail(email: string, name: string) {
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: "Welcome to Market Intelligence Platform",
        html: `
          <h1>Welcome ${name}!</h1>
          <p>Thank you for joining our Market Intelligence Platform.</p>
          <p>You'll receive daily insights and market analysis directly to your inbox.</p>
          <p>Get started by exploring the latest market trends on your dashboard.</p>
        `,
      })
    } catch (error) {
      console.error("Welcome email error:", error)
    }
  }

  async sendDailyDigest(email: string, insights: string, articles: any[]) {
    try {
      const articlesHtml = articles
        .map(
          (article) => `
        <div style="margin-bottom: 20px; padding: 15px; border-left: 3px solid #007bff;">
          <h3><a href="${article.url}">${article.title}</a></h3>
          <p>${article.description}</p>
          <small>Source: ${article.source} | ${new Date(article.published_at).toLocaleDateString()}</small>
        </div>
      `,
        )
        .join("")

      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: email,
        subject: "Daily Market Intelligence Digest",
        html: `
          <h1>Daily Market Intelligence</h1>
          <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h2>AI-Generated Insights</h2>
            <p>${insights}</p>
          </div>
          <h2>Top Articles</h2>
          ${articlesHtml}
        `,
      })
    } catch (error) {
      console.error("Daily digest email error:", error)
    }
  }
}
