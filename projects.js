// Автоматически генерируется server.js из projects.json — не редактируй вручную.
SITE.projects = [
  {
    "name": "VHT",
    "category": "web",
    "short": "Визуальный терминал для оплаты.",
    "description": "VHT Terminal — визуальный терминал для оплаты прямо в браузере. Чистый HTML/CSS/JS, работает на GitHub Pages.",
    "tags": [
      "HTML",
      "CSS",
      "JavaScript"
    ],
    "status": "done",
    "year": 2026,
    "links": {
      "github": "https://github.com/CalihandlyYT/vht-terminal",
      "telegram": "",
      "demo": "https://calihandlyyt.github.io/vht-terminal/"
    }
  },
  {
    "name": "Vesper",
    "category": "app",
    "short": "ИИ-ассистент для Windows, который читает твои мессенджеры и соцсети.",
    "description": "Десктоп-приложение: спрашиваешь «кто мне писал вчера в Telegram?» или «сделай сводку за день» — и получаешь ответ. Мозг — DeepSeek (V4 Pro и Flash). Работает только на чтение. Есть аккаунты, тарифы с лимитами, баланс и свой сервер, через который идут запросы к ИИ.",
    "tags": [
      "Electron",
      "TypeScript",
      "Node.js"
    ],
    "status": "abandoned",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "https://t.me/heyvesper",
      "demo": "https://heyvesper.duckdns.org"
    }
  },
  {
    "name": "ThinkGram",
    "category": "app",
    "short": "Свой мессенджер: Android-клиент, MTProto-сервер и Telegram-бот.",
    "description": "Форк Android-клиента + сервер Teamgram (MTProto) + бот, который выдаёт номера и продаёт звёзды за Telegram Stars. Отдельно — десктоп/веб-версия на базе Telegram Web A с Tauri-сборкой в .exe.",
    "tags": [
      "Android",
      "MTProto",
      "React",
      "Tauri",
      "Docker"
    ],
    "status": "abandoned",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "https://t.me/thinkgram_official_bot",
      "demo": ""
    }
  },
  {
    "name": "ThinkLoader",
    "category": "app",
    "short": "Сайдлоадинг для iPhone и iPad: SideStore, LiveContainer или любой IPA в пару кликов.",
    "description": "Переработанный форк iloader с новым дизайном: тёмный интерфейс, 28 языков, подсказки по ошибкам, управление pairing-файлами и сертификатами разработчика.",
    "tags": [
      "Tauri",
      "Rust",
      "React",
      "TypeScript"
    ],
    "status": "active",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  },
  {
    "name": "Giftora Market",
    "category": "web",
    "short": "Биржа цифровых товаров Telegram: звёзды, Premium, NFT-подарки, юзернеймы.",
    "description": "Маркетплейс по модели FunPay: продавать может любой, каждая сделка проходит через гаранта площадки (деньги замораживаются до подтверждения). Автовыдача товара и админ-панель Giftora Control.",
    "tags": [
      "Node.js",
      "Express",
      "SQLite"
    ],
    "status": "abandoned",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  },
  {
    "name": "AstraCloud",
    "category": "web",
    "short": "Сайт продажи VPN-серверов в Германии.",
    "description": "Лендинг, регистрация через почту и Telegram, личный кабинет с заказом серверов, тарифы, автопродление и HTTP API с вебхуками для внешней панели, которая поднимает VPN на нодах.",
    "tags": [
      "Node.js",
      "Express",
      "SQLite",
      "REST API"
    ],
    "status": "abandoned",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  },
  {
    "name": "FragHub",
    "category": "web",
    "short": "Сайт серверов CS2: мониторинг, вход через Steam, тарифы.",
    "description": "Серверы в реальном времени, профиль из Steam (ник, аватар, часы в CS2), жалобы и заявки на разбан, админка. Firebase (Firestore + Auth) и Cloudflare Worker для входа через Steam.",
    "tags": [
      "Firebase",
      "Cloudflare Workers",
      "JavaScript"
    ],
    "status": "wip",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  },
  {
    "name": "RESPAWN",
    "category": "web",
    "short": "Чаты и форум для геймеров с сообщениями в реальном времени.",
    "description": "Темы по играм, чаты внутри тем, мгновенные сообщения через Server-Sent Events, картинки через Ctrl+V и drag&drop (формат проверяется по содержимому файла), роли и права.",
    "tags": [
      "Node.js",
      "Express",
      "SQLite",
      "SSE"
    ],
    "status": "abandoned",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  },
  {
    "name": "Sonora",
    "category": "web",
    "short": "Музыкальная площадка.",
    "description": "Веб-площадка для музыки: свой сервер на Node.js и фронтенд с темами оформления.",
    "tags": [
      "Node.js",
      "JavaScript"
    ],
    "status": "abandoned",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  },
  {
    "name": "Halcyra",
    "category": "bot",
    "short": "Telegram-бот подписки на VPN с оплатой звёздами.",
    "description": "aiogram 3: оплата Telegram Stars (разовая и автопродление), тарифы, пробный период, мультиустройства, рефералка, промокоды, RU/EN, напоминания об окончании подписки и мини-админка.",
    "tags": [
      "Python",
      "aiogram",
      "SQLite",
      "Telegram Stars"
    ],
    "status": "active",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "https://t.me/halcyra_vpn",
      "demo": ""
    }
  },
  {
    "name": "OwicogStars",
    "category": "bot",
    "short": "Бот для покупки звёзд, Premium, TON и аренды NFT.",
    "description": "Все покупки становятся заказами и выполняются через админ-панель в боте. Каталог NFT, настраиваемые цены, пополнение баланса через тикеты. Покрыт тестами (pytest).",
    "tags": [
      "Python",
      "aiogram",
      "SQLite",
      "pytest"
    ],
    "status": "abandoned",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  },
  {
    "name": "NickOrbit",
    "category": "bot",
    "short": "Генератор свободных юзернеймов Telegram + оценка в TON.",
    "description": "Пресеты и маски для генерации юзов, многопоточная проверка через t.me и fragment.com, оценка стоимости юзернейма в TON, подключение к профилю через Business Mode и мини-игры.",
    "tags": [
      "Python",
      "aiogram",
      "asyncio"
    ],
    "status": "abandoned",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  },
  {
    "name": "SpringYard",
    "category": "game",
    "short": "Физическая аркада про батутную акробатику для iOS и Android.",
    "description": "Мобильная игра на Unity 6. Сборка .ipa для iPhone через GitHub Actions на облачном Mac, APK для Android, отдельный сайт игры.",
    "tags": [
      "Unity",
      "C#",
      "GitHub Actions",
      "Mobile"
    ],
    "status": "active",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  },
  {
    "name": "Roblox-игра",
    "category": "game",
    "short": "Совместная игра в Roblox Studio.",
    "description": "Игра в Roblox, которую делаю вместе с другом: модели, механики и логика на Luau.",
    "tags": [
      "Roblox",
      "Luau"
    ],
    "status": "wip",
    "year": 2026,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  },
  {
    "name": "Lumora Launcher",
    "category": "app",
    "short": "Лаунчер для Minecraft с поддержкой модов.",
    "description": "Десктопный лаунчер для Minecraft на Electron: установка и запуск игры, моды.",
    "tags": [
      "Electron",
      "Node.js"
    ],
    "status": "abandoned",
    "year": 2025,
    "links": {
      "github": "",
      "telegram": "",
      "demo": ""
    }
  }
];
