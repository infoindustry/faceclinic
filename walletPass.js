import { Template } from '@walletpass/pass-js';
import path from 'path';

async function createWalletPass(certificateNumber, userName) {
    try {
        // Создаем шаблон для пропуска
        const template = new Template('storeCard', {
            passTypeIdentifier: 'pass.com.faceclinic.certificate', // Замените на ваш идентификатор
            teamIdentifier: 'YOUR_TEAM_ID', // Замените на ваш Team ID из Apple Developer
            organizationName: 'FaceClinic Moscow',
            description: 'Сертификат на услуги FaceClinic',
            logoText: 'FaceClinic',
            foregroundColor: 'rgb(255, 255, 255)',
            backgroundColor: 'rgb(60, 65, 76)',
        });

        // Загружаем необходимые сертификаты
        await template.loadCertificate(
            'path/to/signerCert.pem', // Путь к вашему сертификату
            'path/to/signerKey.pem'   // Путь к вашему ключу
        );

        // Создаем пропуск из шаблона
        const pass = template.createPass({
            serialNumber: certificateNumber,
            // Основная информация на передней стороне пропуска
            primaryFields: [
                {
                    key: 'balance',
                    label: 'Номинал',
                    value: '10 000 ₽'
                }
            ],
            // Дополнительная информация
            secondaryFields: [
                {
                    key: 'certificate',
                    label: 'Номер сертификата',
                    value: certificateNumber
                }
            ],
            // Информация на обратной стороне
            backFields: [
                {
                    key: 'terms',
                    label: 'Условия использования',
                    value: 'Сертификат действителен при наличии подписки на канал FaceClinic Moscow. Подробные условия: faceclinicmoscow.com/sertterms'
                }
            ]
        });

        // Добавляем изображения
        await pass.images.add('icon', path.join(__dirname, 'assets/icon.png'));
        await pass.images.add('logo', path.join(__dirname, 'assets/logo.png'));

        // Генерируем .pkpass файл
        const buffer = await pass.asBuffer();

        return buffer;
    } catch (error) {
        console.error('Error creating wallet pass:', error);
        throw error;
    }
}

export default createWalletPass;