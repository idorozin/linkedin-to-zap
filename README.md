# 🚀 Link2Zap - LinkedIn Extension

A powerful Chrome extension that seamlessly extracts LinkedIn profile data and sends it to any automation tool via Zapier-compatible webhooks. Perfect for sales teams, recruiters, and business development professionals.

## ✨ Features

### 🎯 **Smart Profile Extraction**

- **Dual Mode Support**: Works on both regular LinkedIn profiles and LinkedIn Sales Navigator
- **Comprehensive Data**: Extracts name, job title, company, experience, education, and more
- **Intelligent Parsing**: Handles complex profile structures with fallback mechanisms

## 🛠️ Installation

### Load as Unpacked Extension (Development)

1. **Download the Extension**

   ```bash
   git clone https://github.com/idorozin/linkedin-to-zap
   cd linkedin-to-zap
   ```
   alternatively download the repo as zip and extract the zip.
2. **Add your custom web-hook url**

   - open the file `/src/config/config.js` with any text editor.
   - replace `YOUR_ZAPIER_WEBHOOK_URL` with your webhook url.

3. **Open Chrome Extensions**

   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

4. **Load the Extension**

   - Click "Load unpacked"
   - Select the extension folder
   - The extension icon should appear in your toolbar

## 🚀 Quick Start

### 1. **Setup Webhook Integration**

- The extension is pre-configured with a Zapier webhook
- For custom integrations, update the `webhookUrl` in the content scripts

### 2. **Navigate to LinkedIn**

- Go to any LinkedIn profile page
- Works on both `linkedin.com/in/profile` and `linkedin.com/sales/` URLs

### 3. **Use the Extension**

- Click the extension icon in your toolbar
- Select your target list or label
- Rate the contact (1-5 stars)
- Add optional notes
- Preview the data (optional)
- Click "Send to Zapier"

## 👍 Contributing

To contribute, email: **[rozin.ido@gmail.com](mailto:rozin.ido@gmail.com)**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for better LinkedIn workflows**
