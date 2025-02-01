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
        `).run(parseInt(userId), analysisResult);
    }

    async analyzePhoto(photoUrl) {
        try {
            console.log('Starting photo analysis with URL:', photoUrl);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",  // Используем актуальную модель
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Пожалуйста, опиши что ты видишь на фото, обращая внимание на: \n1. Общие черты лица\n2. Особенности кожи\n3. Заметные асимметрии или характерные черты"
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: photoUrl
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            });

            console.log('OpenAI API response:', response);
            return response.choices[0].message.content;
        } catch (error) {
            console.error('Detailed API error:', error);
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
            console.log('Received photo message:', msg.photo); // Логируем весь массив фото

            const photo = msg.photo[msg.photo.length - 1];
            console.log('Selected photo:', photo); // Логируем выбранное фото

            const fileLink = await bot.getFileLink(photo.file_id);
            console.log('Generated file link:', fileLink); // Логируем полученную ссылку

            await bot.sendMessage(chatId, '🔍 Анализирую ваше фото... Это может занять несколько секунд.');

            // Проверяем доступность файла
            try {
                const testResponse = await axios.head(fileLink);
                console.log('File accessibility check:', testResponse.status);
            } catch (error) {
                console.error('File accessibility error:', error.message);
            }

            const analysis = await analyzer.analyzePhoto(fileLink);
            console.log('Raw GPT response:', analysis);  // Логируем сырой ответ от GPT

            if (!analysis || analysis.includes('Извините')) {
                console.error('Analysis failed or returned apology');
                throw new Error('Failed to analyze photo');
            }

            analyzer.recordAnalysis(chatId, analysis);

            await bot.sendMessage(chatId, analysis, { parse_mode: 'Markdown' });

            await bot.sendMessage(chatId, `
📞 Хотите обсудить результаты с нашими специалистами?

Запишитесь на консультацию:
☎️ [Позвонить](tel:+79266568808)
💬 [Написать в WhatsApp](https://api.whatsapp.com/send?phone=79266568808)
        `, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Full error object:', error);
            console.error('Error stack:', error.stack);
            bot.sendMessage(chatId, 'Произошла ошибка при анализе фото. Пожалуйста, убедитесь что на фото четко видно лицо анфас при хорошем освещении и попробуйте еще раз.');
        } finally {
            userStates.delete(chatId);
        }
    });
};