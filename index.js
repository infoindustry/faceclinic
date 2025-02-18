import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import { addCertificateToSheet, syncAllCertificates, setupGoogleSheet } from './sheets.js';

import createWalletPass from './walletPass.js';
/*
import { setupPhotoAnalysis } from './photoAnalysis.js';
*/


// Создаём HTTP-сервер
const app = express();

app.get('/', (req, res) => {
    res.send('Bot is running!');
});
const PORT = process.env.PORT || 3000;


app.post('/webhook', express.json(), (req, res) => {
    bot.processUpdate(req.body); // Обработка входящих обновлений
    res.sendStatus(200); // Ответ для Telegram API
});


// Переменные окружения
const TOKEN = process.env.TOKEN;
const ADMIN_CHAT_IDS = process.env.ADMIN_CHAT_ID.split(';').map(id => id.trim());console.log('Admin IDs:', ADMIN_CHAT_IDS); // Добавьте эту строку здесь
const CHANNEL_USERNAME = '@faceclinicmoscowchannel';

console.log('TOKEN:', process.env.TOKEN);
console.log('ADMIN_CHAT_IDS:', process.env.ADMIN_CHAT_ID);

if (!TOKEN || !process.env.ADMIN_CHAT_ID) {
    console.error('❌ Не удалось найти переменные окружения TOKEN или ADMIN_CHAT_ID.');
    process.exit(1);
}

const webhookUrl = 'https://faceclinic-production.up.railway.app/webhook'


const bot = new TelegramBot(TOKEN);

// ИИ анализ фото


// Настройка webhook

// Удаляем старый webhook перед установкой нового
// Функция для установки вебхука с повторными попытками
async function setupWebhook(retries = 3, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            // Сначала удаляем старый вебхук
            await axios.post(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`);

            // Ждем немного перед установкой нового
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Устанавливаем новый вебхук
            const response = await axios.post(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
                url: webhookUrl
            });

            console.log('Webhook successfully set:', response.data);

            // Проверяем информацию о вебхуке
            const webhookInfo = await axios.get(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
            console.log('Webhook info:', webhookInfo.data);

            return true; // Успешно установили вебхук
        } catch (error) {
            console.error(`Attempt ${i + 1}/${retries} failed:`, error.message);

            if (i < retries - 1) {
                console.log(`Waiting ${delay/1000} seconds before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('Failed to set webhook after all retries');
                throw error;
            }
        }
    }
}

// Вызываем функцию после объявления
setupWebhook().catch(console.error);

// После установки вебхука добавьте проверку
bot.getWebHookInfo().then((info) => {
    console.log('Webhook info:', info);
    if (info.url !== webhookUrl) {
        console.log('Webhook URL не совпадает, переустанавливаем...');
        return setupWebhook();
    }
}).catch(console.error);

// Подключение к базе данных
const db = new Database('/data/certificates.db', { verbose: console.log });


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

function restoreData() {
    const certificates = [
        {
            date: '2025-02-18',
            name: 'Игорь',
            phone: '+79031813591',
            certificate_number: 'Tel2025-C14A4960',
            telegram_id: '409036058'
        },
        {
            date: '2025-02-18',
            name: 'Нина',
            phone: '89801468718',
            certificate_number: 'Tel2025-AFCA1A44',
            telegram_id: '970819446'
        },
        {
            date: '2025-02-18',
            name: 'Екатерина',
            phone: '89164159118',
            certificate_number: 'Tel2025-B4DF23E1',
            telegram_id: '108212039'
        },
        {
            date: '2025-02-18',
            name: 'Наталия',
            phone: '79152992666',
            certificate_number: 'Tel2025-F5790714',
            telegram_id: '1228610222'
        },
        {
            date: '2025-02-18',
            name: 'Мария',
            phone: '+79268661316',
            certificate_number: 'Tel2025-05E19C80',
            telegram_id: '941632154'
        },
        {
            date: '2025-02-18',
            name: 'Екатерина',
            phone: '89652029282',
            certificate_number: 'Tel2025-2EEAD48C',
            telegram_id: '749015499'
        },
        {
            date: '2025-02-18',
            name: 'Olga',
            phone: '9262066893',
            certificate_number: 'Tel2025-1699CA6F',
            telegram_id: '488423584'
        },
        {
            date: '2025-02-18',
            name: 'Алина',
            phone: '89771178757',
            certificate_number: 'Tel2025-64A28B3C',
            telegram_id: '536178570'
        },
        {
            date: '2025-02-18',
            name: 'Анна',
            phone: '89775838104',
            certificate_number: 'Tel2025-280630B7',
            telegram_id: '668415255'
        },
        {
            date: '2025-02-18',
            name: 'Ксения',
            phone: '9161225057',
            certificate_number: 'Tel2025-80EF6DF9',
            telegram_id: '784523368'
        },
        {
            date: '2025-02-18',
            name: 'Елизавета',
            phone: '89157626833',
            certificate_number: 'Tel2025-772FFB45',
            telegram_id: '1701911729'
        },
        {
            date: '2025-02-18',
            name: 'Анастасия',
            phone: '89015685326',
            certificate_number: 'Tel2025-9BC8B50E',
            telegram_id: '1534410963'
        },
        {
            date: '2025-02-18',
            name: 'Ольга',
            phone: '+4917680448476',
            certificate_number: 'Tel2025-DA3DB649',
            telegram_id: '487559052'
        },
        {
            date: '2025-02-18',
            name: 'Мая',
            phone: '+79151879142',
            certificate_number: 'Tel2025-DDB551CA',
            telegram_id: '5060919326'
        },
        {
            date: '2025-02-18',
            name: 'Юсиф',
            phone: '+994773772799',
            certificate_number: 'Tel2025-FF210317',
            telegram_id: '5846870012'
        },
        {
            date: '2025-02-18',
            name: 'Елена Панова',
            phone: '+79122775544',
            certificate_number: 'Tel2025-E290CDF3',
            telegram_id: '1100585822'
        },
        {
            date: '2025-02-18',
            name: 'Артём',
            phone: '89091433726',
            certificate_number: 'Tel2025-7346F2CD',
            telegram_id: '1623101883'
        },
        {
            date: '2025-02-18',
            name: 'Серебрякова',
            phone: '89161973716',
            certificate_number: 'Tel2025-A190744E',
            telegram_id: '7195810799'
        },
        {
            date: '2025-02-18',
            name: 'Сергей',
            phone: '89111778815',
            certificate_number: 'Tel2025-EB36F988',
            telegram_id: '399442019'
        },
        {
            date: '2025-02-18',
            name: 'Алёна Смолина',
            phone: '+79254159331',
            certificate_number: 'Tel2025-E693252C',
            telegram_id: '1924907932'
        },
        {
            date: '2025-02-18',
            name: 'Анастасия',
            phone: '89661456190',
            certificate_number: 'Tel2025-98A33ACB',
            telegram_id: '413945477'
        },
        {
            date: '2025-02-18',
            name: 'Снах',
            phone: '+79055177111',
            certificate_number: 'Tel2025-CFF7EBF5',
            telegram_id: '864021898'
        }
    ];

    try {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO certificates 
            (certificate_number, telegram_id, name, phone, created_at, username)
            VALUES (?, ?, ?, ?, datetime(?), ?)
        `);

        certificates.forEach(cert => {
            stmt.run(
                cert.certificate_number,
                cert.telegram_id,
                cert.name,
                cert.phone,
                cert.date,
                cert.username
            );
        });

        console.log('✅ Данные успешно восстановлены');
    } catch (error) {
        console.error('❌ Ошибка при восстановлении данных:', error);
    }
}

// Вызовите функцию после инициализации базы данных
restoreData();

setupGoogleSheet().then(() => {
    console.log('Google Sheets integration ready');
}).catch(console.error);

/*
setupPhotoAnalysis(bot, db, process.env.OPENAI_API_KEY, checkSubscription);
*/
function isAdmin(chatId) {
    return ADMIN_CHAT_IDS.includes(chatId.toString());
}

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

    for (const adminId of ADMIN_CHAT_IDS) {
        try {
            await bot.sendMessage(adminId, userInfo);
            console.log(`Admin ${adminId} notified successfully.`);
        } catch (error) {
            console.error(`Error notifying admin ${adminId}:`, error);
        }
    }
}

const userProgress = {};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const isAdminUser = isAdmin(chatId);

    // Базовая клавиатура для всех пользователей
    const baseKeyboard = [
        ['🔗 Подписаться на канал', '📜 Получить сертификат'],
        ['✅ Проверить сертификат', 'ℹ️ Помощь']
    ];

    // Если пользователь админ, добавляем админские кнопки
    if (isAdminUser) {
        baseKeyboard.push(
            ['🔍 Поиск сертификата', '📊 Последние сертификаты'],
            ['👨‍💼 Админ-помощь']
        );
    }

    // Отправляем приветственное сообщение с соответствующей клавиатурой
    const welcomeMessage = isAdminUser
        ? 'Добро пожаловать в панель управления FaceClinic! У вас есть доступ к админ-функциям.'
        : 'Добро пожаловать в FaceClinic! Используйте меню ниже для взаимодействия.';

    bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
            keyboard: baseKeyboard,
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

            // Добавляем запись в Google Sheets
            const certificateData = {
                certificate_number: certificateNumber,
                telegram_id: chatId,
                name,
                phone,
                created_at: new Date().toISOString()
            };

            await addCertificateToSheet(certificateData);

            const certificateText = `
🎉 Поздравляем! Вы получили персональный сертификат на сумму 10 000 рублей.
📜 Номер сертификата: ${certificateNumber}
Условия использования: https://faceclinicmoscow.com/sertterms
            `;

            await bot.sendMessage(chatId, certificateText);
            await bot.sendPhoto(chatId, 'https://static.tildacdn.com/stor3330-3636-4632-a235-393765366538/51622874.jpg', {
                caption: 'Ваш сертификат отправлен! Условия указаны на сайте.',
            });

            // Добавляем отправку Apple Wallet pass
         /*   try {
                const passBuffer = await createWalletPass(certificateNumber, name);
                await bot.sendDocument(chatId, passBuffer, {
                    filename: `FaceClinic-${certificateNumber}.pkpass`,
                    caption: 'Добавьте ваш сертификат в Apple Wallet'
                });
                console.log(`Wallet pass sent for certificate: ${certificateNumber}`);
            } catch (error) {
                console.error('Error sending wallet pass:', error);
                // Продолжаем работу бота, даже если отправка pass не удалась
            }*/

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

// Функция нормализации номера телефона
function normalizePhone(phone) {
    // Убираем все кроме цифр
    let cleaned = phone.replace(/\D/g, '');

    // Если номер начинается с 8, заменяем на 7
    if (cleaned.startsWith('8')) {
        cleaned = '7' + cleaned.slice(1);
    }

    // Если номер не начинается с 7, добавляем 7
    if (!cleaned.startsWith('7')) {
        cleaned = '7' + cleaned;
    }

    // Проверяем длину
    if (cleaned.length !== 11) {
        return null;
    }

    return cleaned;
}

// Функция нормализации номера сертификата
function normalizeCertNumber(cert) {
    // Приводим к верхнему регистру и убираем лишние пробелы
    return cert.trim().toUpperCase();
}

// Обновленная команда проверки сертификата
bot.onText(/\/check_cert (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!isAdmin(chatId)) {
        return bot.sendMessage(chatId, '❌ У вас нет прав администратора');
    }

    const certNumber = normalizeCertNumber(match[1]);

    try {
        // Используем LIKE для поиска без учета регистра
        const result = db.prepare(`
            SELECT c.*, 
                   datetime(c.created_at, 'localtime') as local_time
            FROM certificates c 
            WHERE UPPER(certificate_number) LIKE UPPER(?)
        `).get(certNumber);

        if (result) {
            const message = `
📜 Информация о сертификате:
Номер: ${result.certificate_number}
Telegram ID: ${result.telegram_id}
Имя: ${result.name || 'Не указано'}
Телефон: ${result.phone || 'Не указан'}
Дата выдачи: ${result.local_time}
            `;
            bot.sendMessage(chatId, message);
        } else {
            // Попробуем найти похожие сертификаты
            const similarResults = db.prepare(`
                SELECT certificate_number
                FROM certificates 
                WHERE UPPER(certificate_number) LIKE UPPER(?)
                LIMIT 5
            `).all(`%${certNumber}%`);

            let message = '❌ Точное совпадение не найдено.';
            if (similarResults.length > 0) {
                message += '\nПохожие сертификаты:\n' +
                    similarResults.map(r => r.certificate_number).join('\n');
            }
            bot.sendMessage(chatId, message);
        }
    } catch (error) {
        console.error('Error checking certificate:', error);
        bot.sendMessage(chatId, '❌ Ошибка при проверке сертификата');
    }
});

// Обновленная команда проверки по телефону
bot.onText(/\/check_phone (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!isAdmin(chatId)) {
        return bot.sendMessage(chatId, '❌ У вас нет прав администратора');
    }

    const rawPhone = match[1];
    const normalizedPhone = normalizePhone(rawPhone);

    if (!normalizedPhone) {
        return bot.sendMessage(chatId, '❌ Некорректный формат номера телефона');
    }

    try {
        // Ищем по нормализованному номеру
        const results = db.prepare(`
            SELECT c.*, 
                   datetime(c.created_at, 'localtime') as local_time
            FROM certificates c 
            WHERE phone LIKE ? 
               OR phone LIKE ? 
               OR phone LIKE ? 
               OR phone LIKE ?
        `).all([
            `%${normalizedPhone}%`,
            `%+${normalizedPhone}%`,
            `%8${normalizedPhone.slice(1)}%`,
            `%+8${normalizedPhone.slice(1)}%`
        ]);

        if (results.length > 0) {
            const messages = results.map(result => `
📱 Найден сертификат:
Номер сертификата: ${result.certificate_number}
Telegram ID: ${result.telegram_id}
Имя: ${result.name || 'Не указано'}
Телефон: ${result.phone}
Дата выдачи: ${result.local_time}
            `);

            // Отправляем каждый результат отдельным сообщением
            for (const message of messages) {
                await bot.sendMessage(chatId, message);
            }

            if (results.length > 1) {
                await bot.sendMessage(chatId, `\n⚠️ Найдено ${results.length} сертификатов с этим номером телефона`);
            }
        } else {
            bot.sendMessage(chatId, '❌ Сертификаты с таким номером телефона не найдены');
        }
    } catch (error) {
        console.error('Error checking phone:', error);
        bot.sendMessage(chatId, '❌ Ошибка при проверке телефона');
    }
});

// Добавим быструю проверку по части номера сертификата или телефона
bot.onText(/\/search (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!isAdmin(chatId)) {
        return bot.sendMessage(chatId, '❌ У вас нет прав администратора');
    }

    const query = match[1].trim();

    try {
        // Ищем и по номеру сертификата, и по телефону
        const results = db.prepare(`
            SELECT *, 
                   datetime(created_at, 'localtime') as local_time
            FROM certificates 
            WHERE UPPER(certificate_number) LIKE UPPER(?)
               OR phone LIKE ?
            LIMIT 5
        `).all([`%${query}%`, `%${query}%`]);

        if (results.length > 0) {
            const message = results.map(cert => `
🔍 Найдено совпадение:
Сертификат: ${cert.certificate_number}
Имя: ${cert.name || 'Не указано'}
Телефон: ${cert.phone || 'Не указан'}
Дата: ${cert.local_time}
            `).join('\n---\n');

            await bot.sendMessage(chatId, message);

            if (results.length === 5) {
                await bot.sendMessage(chatId, '⚠️ Показаны только первые 5 результатов. Уточните поиск для более точных результатов.');
            }
        } else {
            bot.sendMessage(chatId, '❌ Ничего не найдено');
        }
    } catch (error) {
        console.error('Error searching:', error);
        bot.sendMessage(chatId, '❌ Ошибка при поиске');
    }
});


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!isAdmin(chatId)) return;

    switch (text) {
        case '🔍 Поиск сертификата':
            bot.sendMessage(chatId, `
Введите одну из команд для поиска:

/search [текст] - быстрый поиск по номеру или телефону
/check_cert [номер] - поиск по номеру сертификата
/check_phone [телефон] - поиск по телефону
/sync_sheets - синхронизировать все сертификаты с Google Sheets

Примеры:
/search ABCD
/check_cert Tel2025-ABCD
/check_phone 89001234567
            `);
            break;

        case '📊 Последние сертификаты':
            // Автоматически показываем последние 5 сертификатов
            const command = '/last_certs 5';
            msg.text = command;
            bot.emit('text', msg, [command, '5']);
            break;

        case '👨‍💼 Админ-помощь':
            const helpMessage = `
Доступные команды администратора:
/sync_sheets - синхронизировать все сертификаты с Google Sheets
/check_cert [номер] - проверить сертификат по номеру
Примеры: 
- /check_cert Tel2025-ABCD1234
- /check_cert tel2025-abcd1234
- /check_cert ABCD1234

/check_phone [телефон] - поиск по номеру телефона
Примеры:
- /check_phone +79001234567
- /check_phone 89001234567
- /check_phone 9001234567

/search [текст] - быстрый поиск по части номера сертификата или телефона
Примеры:
- /search ABCD
- /search 9001

/last_certs [количество] - показать последние сертификаты
Пример: /last_certs 5
            `;
            bot.sendMessage(chatId, helpMessage);
            break;
    }
});

bot.onText(/\/last_certs (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!isAdmin(chatId)) {
        return bot.sendMessage(chatId, '❌ У вас нет прав администратора');
    }

    const limit = parseInt(match[1]) || 5; // По умолчанию 5 записей

    try {
        const results = db.prepare(`
            SELECT *, 
                   datetime(created_at, 'localtime') as local_time
            FROM certificates 
            ORDER BY created_at DESC 
            LIMIT ?
        `).all(limit);

        if (results.length > 0) {
            const message = results.map(cert => `
📜 Сертификат: ${cert.certificate_number}
👤 Имя: ${cert.name || 'Не указано'}
📱 Телефон: ${cert.phone || 'Не указан'}
🕒 Выдан: ${cert.local_time}
            `).join('\n---\n');

            bot.sendMessage(chatId, `Последние ${limit} выданных сертификатов:\n${message}`);
        } else {
            bot.sendMessage(chatId, '❌ Сертификаты не найдены');
        }
    } catch (error) {
        console.error('Error getting last certificates:', error);
        bot.sendMessage(chatId, '❌ Ошибка при получении списка сертификатов');
    }
});

function getGoogleSheetUrl() {
    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!GOOGLE_SHEET_ID) {
        console.error('❌ Не удалось найти переменную окружения GOOGLE_SHEET_ID.');
        return null;
    }
    return `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`;
}

// Добавьте новую админ-команду для синхронизации
bot.onText(/\/sync_sheets/, async (msg) => {
    const chatId = msg.chat.id;

    if (!isAdmin(chatId)) {
        return bot.sendMessage(chatId, '❌ У вас нет прав администратора');
    }

    try {
        await bot.sendMessage(chatId, '🔄 Начинаем синхронизацию с Google Sheets...');
        const success = await syncAllCertificates(db);

        if (success) {
            const sheetUrl = getGoogleSheetUrl();
            const message = sheetUrl
                ? `✅ Синхронизация успешно завершена.\n[Открыть таблицу Google Sheets](${sheetUrl})`
                : '✅ Синхронизация успешно завершена.';

            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } else {
            await bot.sendMessage(chatId, '❌ Ошибка при синхронизации');
        }
    } catch (error) {
        console.error('Sync error:', error);
        await bot.sendMessage(chatId, '❌ Произошла ошибка при синхронизации');
    }
});

app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server error:', err);
});

console.log('Bot is running...');
