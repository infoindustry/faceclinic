import OpenAI from 'openai';

export class PhotoAnalyzer {
    constructor(db, openaiApiKey) {
        this.db = db;
        this.openai = new OpenAI({
            apiKey: openaiApiKey
        });

        this.initDatabase();
    }

    initDatabase() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS photo_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER NOT NULL,
                analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                analysis_result TEXT
            )
        `);
    }

    checkAnalysisLimit(userId) {
        const result = this.db.prepare(`
            SELECT COUNT(*) as count 
            FROM photo_analysis 
            WHERE telegram_id = ?
        `).get(userId);

        return result.count < 4;
    }

    recordAnalysis(userId, analysisResult) {
        this.db.prepare(`
            INSERT INTO photo_analysis (telegram_id, analysis_result)
            VALUES (?, ?)
        `).run(userId, analysisResult);
    }

    async analyzePhoto(photoUrl) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Ты эксперт в области эстетической медицины. Проанализируй фотографию лица и предоставь подробный анализ в следующем формате:

1. Основной тип старения:
- Какой из типов преобладает: назальный (проблемы в области носа), дентальный (проблемы с зубочелюстной системой) или офтальмологический (проблемы в области глаз)
- Обоснуй свой выбор

2. Признаки старения и состояние кожи:
- Морщины (где расположены, глубина)
- Носогубные складки
- Овал лица
- Текстура и тон кожи
- Пигментация
- Другие особенности

3. Рекомендации по процедурам:
- 2-3 основные процедуры с объяснением их эффекта
- Порядок приоритетности процедур

Пожалуйста, используй профессиональный, но понятный язык. Объем анализа - примерно 200-250 слов.`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: photoUrl
                                }                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error analyzing photo:', error);
            throw error;
        }
    }
}

export const setupPhotoAnalysis = (bot, db, openaiApiKey, checkSubscription) => {
    const analyzer = new PhotoAnalyzer(db, openaiApiKey);
    const userStates = new Map();

    // Обработчик кнопки анализа фото
    bot.on('message', async (msg) => {
        if (msg.text !== '📸 Анализ фото') return;

        const chatId = msg.chat.id;
        const isSubscribed = await checkSubscription(chatId);

        if (!isSubscribed) {
            bot.sendMessage(chatId, 'Для использования функции анализа фото необходимо подписаться на наш канал.');
            return;
        }

        if (!analyzer.checkAnalysisLimit(chatId)) {
            bot.sendMessage(chatId, 'Вы уже использовали максимальное количество анализов (4). Для получения дополнительных консультаций запишитесь на прием.');
            return;
        }

        await bot.sendPhoto(chatId, 'https://static.tildacdn.com/tild3838-6165-4735-b931-636266363865/example.jpeg', {
            caption: `
🤖 Наш ИИ может проанализировать ваше лицо и определить:
- Тип старения
- Состояние кожи
- Рекомендуемые процедуры

📸 Пожалуйста, пришлите фотографию вашего лица как на примере выше:
- При хорошем освещении
- Анфас (прямо)
- Без макияжа
- Без очков`
        });

        userStates.set(chatId, 'waitingForPhoto');
    });

    // Обработчик получения фото
    bot.on('photo', async (msg) => {
        const chatId = msg.chat.id;

        if (userStates.get(chatId) !== 'waitingForPhoto') {
            return;
        }

        try {
            const photo = msg.photo[msg.photo.length - 1];
            const fileLink = await bot.getFileLink(photo.file_id);

            await bot.sendMessage(chatId, '🔍 Анализирую ваше фото... Это может занять несколько секунд.');

            const analysis = await analyzer.analyzePhoto(fileLink);
            analyzer.recordAnalysis(chatId, analysis);

            await bot.sendMessage(chatId, analysis, { parse_mode: 'Markdown' });

            await bot.sendMessage(chatId, `
📞 Хотите обсудить результаты с нашими специалистами?

Запишитесь на консультацию:
☎️ <a href="tel:+79266568808">Позвонить</a>
💬 <a href="https://api.whatsapp.com/send?phone=79266568808">Написать в WhatsApp</a>
`, { parse_mode: 'HTML' });

        } catch (error) {
            console.error('Error processing photo:', error);
            bot.sendMessage(chatId, 'Произошла ошибка при анализе фото. Пожалуйста, попробуйте позже или свяжитесь с нами напрямую.');
        } finally {
            userStates.delete(chatId);
        }
    });
};