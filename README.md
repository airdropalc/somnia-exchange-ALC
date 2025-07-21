🤖 Somnia Multi-Pair Swap Bot

An automated, interactive bot for executing specific swap strategies on the Somnia platform. This tool is designed to save you time and effort by handling repetitive swaps automatically.

If you are new to Somnia, you can register on their official platform.
*(Optional: You can replace the banner below with your own referral link)*

[![Telegram](https://img.shields.io/badge/Community-Airdrop_ALC-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/airdropalc/2127)

---

## ✨ Key Features

This bot uses an interactive command-line interface (CLI) to make setup easy and flexible.

* **🗣️ Interactive CLI Setup:** No need to edit code. The bot guides you through a series of questions to configure your desired actions.
* **🎯 Specific Swap Strategies:** The bot is pre-configured to handle key trading pairs on Somnia. The supported flows are:
    * **STT ↔️ USDTG** (swaps in both directions)
    * **STT ↔️ NAI** (swaps in both directions)
* **🗓️ Flexible Execution Modes:** You decide how the bot operates:
    * **Run Once:** Execute your configured swaps a single time.
    * **Run Daily:** Set up a cron job automatically to perform the swaps every 24 hours.
* **👥 Multi-Wallet Support:** Manage and run tasks for multiple wallets simultaneously.
* **🌐 Optional Proxy Integration:** Supports the use of proxies for enhanced privacy and to avoid potential rate-limiting.

---

## 🛠️ Installation & Configuration Guide

### Prerequisites
* **Node.js** (version 18 or higher recommended)
* **npm** (usually included with Node.js)

### Step 1: Clone the Repository
Download the project files to your machine and navigate into the directory.
```bash
git clone https://github.com/airdropalc/somnia-exchange-ALC.git
cd somnia-exchange-ALC
```

### Step 2: Install Dependencies
Install the required Node.js packages.
```bash
npm install
```

### Step 3: Run the Interactive Bot
This is where the magic happens. Start the bot, and it will ask you a series of questions to configure the swaps.
```bash
node index.js
```
Simply follow the on-screen prompts to select your swap strategies, amounts, and execution mode (run once or daily).

---

## ⚠️ Important Security Disclaimer

**This software is provided for educational and experimental purposes only. Use it wisely and entirely at your own risk.**

* **Handle Your Private Keys With Extreme Care:** Your private keys grant **complete and irreversible control** over your funds.
* **NEVER share your private keys** or commit your `.env` file to a public GitHub repository.
* The authors and contributors of this project are **not responsible for any form of financial loss**, account compromise, or other damages. The security of your assets is **your responsibility**.

---
> Inspired by and developed for the [Airdrop ALC](https://t.me/airdropalc) community.

## License

![Version](https://img.shields.io/badge/version-1.1.0-blue)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()

---
