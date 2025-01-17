import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Токен Telegram-бота
const TOKEN = '7922934809:AAFrbHWWtShig5R12WcCrBpHht72XVD9MKQ';
const bot = new TelegramBot(TOKEN, { polling: true });

// ID вашего канала
const CHANNEL_USERNAME = '@faceclinicmoscowchannel';

// Telegram ID администратора для уведомлений
const ADMIN_CHAT_ID = '641297325'; // Замените на ваш Telegram ID

// Подключение к базе данных
const dbPromise = open({
    filename: './certificates.db',
    driver: sqlite3.Database,
});

// Инициализация базы данных
async function initializeDatabase() {
    const db = await dbPromise;
    await db.exec(`
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

// Генерация уникального номера сертификата
function generateCertificateNumber() {
    const uniqueId = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `Tel2025-${uniqueId}`;
}

// Проверка подписки на канал
async function checkSubscription(userId) {
    try {
        const chatMember = await bot.getChatMember(CHANNEL_USERNAME, userId);
        return ['member', 'creator', 'administrator'].includes(chatMember.status);
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}

// Проверка наличия сертификата
async function getCertificate(userId) {
    try {
        const db = await dbPromise;
        const result = await db.get(`
            SELECT certificate_number FROM certificates WHERE telegram_id = ?
        `, [userId]);
        return result?.certificate_number || null;
    } catch (error) {
        console.error('Error checking certificate:', error);
        return null;
    }
}

// Уведомление администратора
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

// Хранение промежуточных данных
const userProgress = {};

// Обработчик команды /start
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

// Обработчик сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (userProgress[chatId]?.step === 'waitingForName') {
        if (text === '📜 Получить сертификат') {
            bot.sendMessage(chatId, 'Вы уже начали процесс ввода данных. Пожалуйста, введите ваше имя, чтобы продолжить.');
            return;
        }
        // Сохранение имени
        userProgress[chatId].name = text;
        userProgress[chatId].step = 'waitingForPhone';
        bot.sendMessage(chatId, 'Пожалуйста, введите ваш номер телефона:');
        return;
    }

    if (userProgress[chatId]?.step === 'waitingForPhone') {
        if (text === '📜 Получить сертификат') {
            bot.sendMessage(chatId, 'Вы уже начали процесс ввода данных. Пожалуйста, введите ваш номер телефона, чтобы продолжить.');
            return;
        }
        const phone = text.trim();

        // Проверка телефона
        const phoneRegex = /^\+?\d{10,15}$/;
        if (!phoneRegex.test(phone)) {
            bot.sendMessage(chatId, `
❌ Некорректный номер телефона. Пожалуйста, введите номер телефона в международном формате, например: +1234567890.
            `);
            return;
        }

        // Сохранение телефона
        userProgress[chatId].phone = phone;
        const { name } = userProgress[chatId];
        userProgress[chatId].step = 'done';

        // Генерация сертификата
        const certificateNumber = generateCertificateNumber();

        try {
            const db = await dbPromise;
            await db.run(`
                INSERT INTO certificates (certificate_number, telegram_id, name, phone)
                VALUES (?, ?, ?, ?)
            `, [certificateNumber, chatId, name, phone]);

            const certificateText = `
🎉 Поздравляем! Вы получили персональный сертификат на сумму 10 000 рублей.

📜 Номер сертификата: ${certificateNumber}

Условия использования сертификата указаны на сайте: https://faceclinicmoscow.com/sertterms
            `;

            await bot.sendMessage(chatId, certificateText);
            await bot.sendPhoto(chatId, 'https://static.tildacdn.com/stor3330-3636-4632-a235-393765366538/51622874.jpg', {
                caption: 'Ваш сертификат отправлен! Условия использования указаны на сайте.',
            });

            console.log(`Certificate issued: ${certificateNumber} for Telegram ID: ${chatId}`);
            await notifyAdmin(certificateNumber, msg.from, name, phone);
        } catch (error) {
            console.error('Error issuing certificate:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при выдаче сертификата. Попробуйте позже.');
        }

        delete userProgress[chatId];
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

        if (!isSubscribed) {
            bot.sendMessage(chatId, `
❌ Вы не подписаны на наш канал.
Пожалуйста, подпишитесь: [FaceClinic Moscow](https://t.me/${CHANNEL_USERNAME.slice(1)})
Затем нажмите "📜 Получить сертификат" снова.
            `, { parse_mode: 'Markdown' });
        } else {
            const existingCertificate = await getCertificate(chatId);

            if (existingCertificate) {
                bot.sendMessage(chatId, `
❗ У вас уже есть сертификат: ${existingCertificate}.
                `);
            } else {
                userProgress[chatId] = { step: 'waitingForName' };
                bot.sendMessage(chatId, 'Пожалуйста, введите ваше имя:');
            }
        }
        return;
    }

    if (text === '✅ Проверить сертификат') {
        const certificateNumber = await getCertificate(chatId);

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
            bot.sendMessage(chatId, `
❌ У вас нет сертификата. Вы можете получить его, нажав "📜 Получить сертификат".
            `);
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
