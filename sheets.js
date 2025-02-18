// sheets.js
import { google } from 'googleapis';
import path from 'path';
import 'dotenv/config';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Проверяем наличие всех необходимых переменных
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;

if (!GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID || !GOOGLE_CLIENT_EMAIL) {
    console.error('❌ Отсутствуют необходимые переменные окружения для Google Sheets:');
    console.log('GOOGLE_PRIVATE_KEY:', GOOGLE_PRIVATE_KEY ? 'Установлен' : 'Отсутствует');
    console.log('GOOGLE_SHEET_ID:', GOOGLE_SHEET_ID ? 'Установлен' : 'Отсутствует');
    console.log('GOOGLE_CLIENT_EMAIL:', GOOGLE_CLIENT_EMAIL ? 'Установлен' : 'Отсутствует');
}

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

// Функция для добавления записи в Google Sheets
export async function addCertificateToSheet(certificateData) {
    try {
        const {
            certificate_number,
            telegram_id,
            name,
            phone,
            created_at
        } = certificateData;

        const values = [
            [
                certificate_number,
                telegram_id.toString(),
                name || '',
                phone || '',
                new Date(created_at).toLocaleString('ru-RU'),
            ]
        ];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Сертификаты!A:E', // Укажите нужный диапазон
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values,
            },
        });

        console.log('Data added to Google Sheets:', response.data);
        return true;
    } catch (error) {
        console.error('Error adding data to Google Sheets:', error);
        return false;
    }
}

// Функция для синхронизации всех данных из БД с Google Sheets
export async function syncAllCertificates(db) {
    try {
        // Получаем все сертификаты из БД
        const certificates = db.prepare(`
            SELECT
                certificate_number,
                telegram_id,
                name,
                phone,
                datetime(created_at, 'localtime') as created_at
            FROM certificates
            ORDER BY created_at DESC
        `).all();

        console.log('Total certificates in database:', certificates.length);
        console.log('First few certificates:', certificates.slice(0, 3));

        // Подготавливаем данные для Google Sheets
        const values = certificates.map(cert => [
            cert.certificate_number,
            cert.telegram_id.toString(),
            cert.name || '',
            cert.phone || '',
            new Date(cert.created_at).toLocaleString('ru-RU'),
        ]);

        console.log('Prepared values for sheets:', values.length);

        // Сначала очищаем существующие данные
        await sheets.spreadsheets.values.clear({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Сертификаты!A2:E', // Не удаляем заголовки
        });

        // Добавляем новые данные
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Сертификаты!A2:E',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values,
            },
        });

        console.log(`Synchronized ${certificates.length} certificates with Google Sheets`);
        return true;
    } catch (error) {
        console.error('Error syncing with Google Sheets:', error);
        console.error('Error details:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
        return false;
    }
}

// Функция для создания и настройки таблицы
export async function setupGoogleSheet() {
    try {
        // Проверяем наличие всех необходимых переменных
        if (!GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID || !GOOGLE_CLIENT_EMAIL) {
            console.error('❌ Не все переменные окружения установлены для Google Sheets');
            return false;
        }

        try {
            // Проверяем существование таблицы
            await sheets.spreadsheets.get({
                spreadsheetId: GOOGLE_SHEET_ID
            });

            // Настраиваем заголовки и форматирование
            const requests = [{
                updateSheetProperties: {
                    properties: {
                        gridProperties: {
                            frozenRowCount: 1
                        }
                    },
                    fields: 'gridProperties.frozenRowCount'
                }
            }];

            // Устанавливаем заголовки
            const headers = [
                ['Номер сертификата', 'Telegram ID', 'Имя', 'Телефон', 'Дата создания']
            ];

            await sheets.spreadsheets.values.update({
                spreadsheetId: GOOGLE_SHEET_ID,
                range: 'Сертификаты!A1:E1',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: headers
                }
            });

            // Применяем форматирование
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: GOOGLE_SHEET_ID,
                resource: {
                    requests
                }
            });

            console.log('✅ Google Sheet setup completed successfully');
            return true;
        } catch (error) {
            if (error.code === 404) {
                console.error('❌ Таблица не найдена. Проверьте GOOGLE_SHEET_ID');
            } else {
                console.error('❌ Ошибка при настройке Google Sheet:', error);
            }
            return false;
        }
    } catch (error) {
        console.error('❌ Критическая ошибка при инициализации Google Sheets:', error);
        return false;
    }
}