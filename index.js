import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import 'dotenv/config';
import express from 'express';

// Создаём HTTP-сервер
const app = express();
app.get('/', (req, res) => {
    res.send('Bot is running!');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
});

// Переменные окружения
const TOKEN = process.env.TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const CHANNEL_USERNAME = '@faceclinicmoscowchannel';

console.log('TOKEN:', process.env.TOKEN);
console.log('ADMIN_CHAT_ID:', process.env.ADMIN_CHAT_ID);

if (!TOKEN || !ADMIN_CHAT_ID) {
    console.error('❌ Не удалось найти переменные окружения TOKEN или ADMIN_CHAT_ID.');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// Подключение к базе данных
const db = new Database('./certificates.db', { verbose: console.log });

function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            certificate_number TEXT NOT NULL UNIQUE,
            telegram_id INTEGER NOT NULL,
            name TEXT,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('Database initialized');
}
initializeDatabase();

function generateCertificateNumber() {
    return `Tel2025-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function checkSubscription(userId) {
    try {
        const chatMember = await bot.getChatMember(CHANNEL_USERNAME, userId);
        return ['member', 'creator', 'administrator'].includes(chatMember.status);
    } catch (error) {
        console.error('Error checking subscription:', error);
        return null;
    }
}

function getCertificate(userId) {
    try {
        const result = db.prepare(`
            SELECT certificate_number FROM certificates WHERE telegram_id = ?
        `).get(userId);
        return result ? result.certificate_number : null;
    } catch (error) {
        console.error('Error checking certificate:', error);
        return null;
    }
}

async function notifyAdmin(certificateNumber, user, name, phone) {
    const userInfo = `
🔔 Новый сертификат выдан!
📜 Номер сертификата: ${certificateNumber}
👤 Пользователь:
  - ID: ${user.id}
  - Username: ${user.username || 'N/A'}
  - Имя: ${name || 'N/A'}
  - Телефон: ${phone || 'N/A'}
    `;
    try {
        await bot.sendMessage(ADMIN_CHAT_ID, userInfo);
        console.log('Admin notified successfully.');
    } catch (error) {
        console.error('Error notifying admin:', error);
    }
}

const userProgress = {};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Добро пожаловать в FaceClinic! Используйте меню ниже для взаимодействия.', {
        reply_markup: {
            keyboard: [
                ['🔗 Подписаться на канал', '📜 Получить сертификат'],
                ['✅ Проверить сертификат', 'ℹ️ Помощь'],
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
        },
    });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (userProgress[chatId]?.step === 'waitingForName') {
        userProgress[chatId].name = text;
        userProgress[chatId].step = 'waitingForPhone';
        bot.sendMessage(chatId, 'Пожалуйста, введите ваш номер телефона:');
        return;
    }

    if (userProgress[chatId]?.step === 'waitingForPhone') {
        const phone = text.trim();
        const phoneRegex = /^\+?\d{10,15}$/;

        if (!phoneRegex.test(phone)) {
            bot.sendMessage(chatId, '❌ Некорректный номер телефона. Введите номер в формате +1234567890.');
            return;
        }

        const name = userProgress[chatId].name;
        const certificateNumber = generateCertificateNumber();

        try {
            db.prepare(`
                INSERT INTO certificates (certificate_number, telegram_id, name, phone)
                VALUES (?, ?, ?, ?)
            `).run(certificateNumber, chatId, name, phone);

            const certificateText = `
🎉 Поздравляем! Вы получили персональный сертификат на сумму 10 000 рублей.
📜 Номер сертификата: ${certificateNumber}
Условия использования: https://faceclinicmoscow.com/sertterms
            `;

            await bot.sendMessage(chatId, certificateText);
            await bot.sendPhoto(chatId, 'https://static.tildacdn.com/stor3330-3636-4632-a235-393765366538/51622874.jpg', {
                caption: 'Ваш сертификат отправлен! Условия указаны на сайте.',
            });

            console.log(`Certificate issued: ${certificateNumber} for Telegram ID: ${chatId}`);
            await notifyAdmin(certificateNumber, msg.from, name, phone);
        } catch (error) {
            console.error('Error issuing certificate:', error);
            bot.sendMessage(chatId, '❌ Ошибка при выдаче сертификата. Попробуйте позже.');
        } finally {
            delete userProgress[chatId];
        }
        return;
    }

    if (text === '🔗 Подписаться на канал') {
        bot.sendMessage(chatId, `
Пожалуйста, подпишитесь на наш канал: [FaceClinic Moscow](https://t.me/${CHANNEL_USERNAME.slice(1)})
После подписки нажмите "📜 Получить сертификат".
        `, { parse_mode: 'Markdown' });
        return;
    }

    if (text === '📜 Получить сертификат') {
        const isSubscribed = await checkSubscription(chatId);

        if (isSubscribed === null) {
            bot.sendMessage(chatId, '❌ Ошибка проверки подписки. Попробуйте позже.');
            return;
        }

        if (!isSubscribed) {
            bot.sendMessage(chatId, `
❌ Вы не подписаны на наш канал.
Пожалуйста, подпишитесь: [FaceClinic Moscow](https://t.me/${CHANNEL_USERNAME.slice(1)})
Затем нажмите "📜 Получить сертификат" снова.
            `, { parse_mode: 'Markdown' });
            return;
        }

        const existingCertificate = getCertificate(chatId);

        if (existingCertificate) {
            bot.sendMessage(chatId, `❗ У вас уже есть сертификат: ${existingCertificate}.`);
        } else {
            userProgress[chatId] = { step: 'waitingForName' };
            bot.sendMessage(chatId, 'Пожалуйста, введите ваше имя:');
        }
        return;
    }

    if (text === '✅ Проверить сертификат') {
        const certificateNumber = getCertificate(chatId);

        if (certificateNumber) {
            const isSubscribed = await checkSubscription(chatId);

            if (isSubscribed) {
                bot.sendMessage(chatId, `
✅ Ваш сертификат действителен.
📜 Номер сертификата: ${certificateNumber}.
                `);
            } else {
                bot.sendMessage(chatId, `
❌ Ваш сертификат недействителен, так как вы отписались от канала.
Пожалуйста, подпишитесь снова: [FaceClinic Moscow](https://t.me/${CHANNEL_USERNAME.slice(1)}).
                `, { parse_mode: 'Markdown' });
            }
        } else {
            bot.sendMessage(chatId, '❌ У вас нет сертификата. Нажмите "📜 Получить сертификат".');
        }
        return;
    }

    if (text === 'ℹ️ Помощь') {
        bot.sendMessage(chatId, `
ℹ️ Чтобы получить сертификат:
1️⃣ Подпишитесь на канал: [FaceClinic Moscow](https://t.me/${CHANNEL_USERNAME.slice(1)})
2️⃣ Нажмите "📜 Получить сертификат".
        `, { parse_mode: 'Markdown' });
        return;
    }

    bot.sendMessage(chatId, 'Пожалуйста, используйте меню ниже.');
});

console.log('Bot is running...');
