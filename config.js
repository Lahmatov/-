// =====================================================================
//  ВСЕ ТЕКСТЫ ИГРЫ — ЗДЕСЬ. Меняй смело, логику трогать не нужно.
// =====================================================================

window.GAME = {
  name: "Карина",
  age: 35,
  from: "Любимый",

  ticker: "С ДНЁМ РОЖДЕНИЯ, КАРИНА ✦ 35 — ЭТО БАЗА ✦ MAIN CHARACTER ✦ МАМА ГОДА ✦ LOVELY LOVE ✦ ЛЕГЕНДА ✦ SLAY 💅 ✦ ",

  // Стикеры (вырезаны из фото, лежат в photos/stickers)
  stickers: {
    coffee:       { img: "photos/stickers/coffee.webp",       cap: "без кофе не разговариваю ☕" },
    serious:      { img: "photos/stickers/serious.webp",      cap: "когда спросили, что на ужин" },
    sideeye:      { img: "photos/stickers/sideeye.webp",      cap: "мама подозревает 👀" },
    paci:         { img: "photos/stickers/paci.webp",         cap: "соска-режим 🍼" },
    aaa:          { img: "photos/stickers/aaa.webp",          cap: "АААА 😱" },
    cat:          { img: "photos/stickers/cat.webp",          cap: "кошка не одобряет 😾" },
    wow:          { img: "photos/stickers/wow.webp",          cap: "ЧТО?! 😮" },
    what:         { img: "photos/stickers/what.webp",         cap: "чё надо? 🤨" },
    monday:       { img: "photos/stickers/monday.webp",       cap: "понедельник 😩" },
    ski:          { img: "photos/stickers/ski.webp",          cap: "снежная королева ❄" },
    cheeks:       { img: "photos/stickers/cheeks.webp",       cap: "щёчки 😴" },
    notimpressed: { img: "photos/stickers/notimpressed.webp", cap: "не впечатлена 😒" },
    dino:         { img: "photos/stickers/dino.webp",         cap: "жую 🦖" },
    fox:          { img: "photos/stickers/fox.webp",          cap: "лис-разбойник 🦊" },
    fist:         { img: "photos/stickers/fist.webp",         cap: "вкусный кулачок 👊" },
    spa:          { img: "photos/stickers/spa.webp",          cap: "SPA-день 🧖" },
    spider:       { img: "photos/stickers/spider.webp",       cap: "элегантно 🕷" },
    spidey:       { img: "photos/stickers/spidey.webp",       cap: "дружелюбный сосед 🕸" },
    siblings:     { img: "photos/stickers/siblings.webp",     cap: "братик и сестрёнка 💞" },
    run:          { img: "photos/stickers/run.webp",          cap: "погнали! ⚽" },
    art:          { img: "photos/stickers/art.webp",          cap: "искусствовед 🖼" },
    turbo:        { img: "photos/stickers/turbo.webp",        cap: "турбо-режим ⚡" },
    witch:        { img: "photos/stickers/witch.webp",        cap: "ведьма и Белоснежка 🧙‍♀️" },
    halloween:    { img: "photos/stickers/halloween.webp",    cap: "хэллоуин-банда 🎃" },
    grumpy2:      { img: "photos/stickers/grumpy2.webp",      cap: "два недовольных 😐" },
  },
  // стикеры, которые выскакивают сбоку в викторине
  reactions: {
    right: ["aaa", "wow", "ski", "spider", "siblings", "run", "cheeks"],
    wrong: ["cat", "monday", "serious", "what", "notimpressed", "grumpy2", "sideeye"],
  },

  // мем-подписи
  memes: {
    success: ["это база 💅", "main character energy ✨", "детектив уровня бог 🕵️‍♀️", "мама может 💪", "slay 💅", "легенда 👑", "тайник даже не сопротивлялся", "изи 😎"],
    right: ["ДА! 🔥", "база ✅", "чётко 💯", "помнит 😭", "+100 к любви ❤", "умничка 🧠"],
    wrong: ["ну такое 😬", "бро… 💀", "кринж, давай ещё", "не-а 🙅‍♀️", "я запомню это 😤", "почти (нет)", "Lovely Love, соберись 😅"],
  },

  steps: [
    // ---------- Вступление ----------
    {
      type: "intro",
      title: "С днём рождения, Карина!",
      text:
        "POV: тебе 35, и сегодня ты главная героиня 💅\n\n" +
        "Тебя ждут 10 загадок. Каждый правильный ответ открывает слово на португальском 🇵🇹 " +
        "Собери фразу целиком, и она скажет, где спрятан подарок.\n\n" +
        "А ещё по пути ты откроешь 35 причин, почему я тебя люблю ❤",
      button: "Погнали 🚀",
    },

    // ================= ГЛАВА 1: кухня ==================
    {
      type: "riddle", chapter: 1, tile: "O TEU PRESENTE",
      riddle: "Утром бодрит, без него ты не разговариваешь. Чёрный, горячий, в чашке стоит ☕ Что это?",
      answers: ["кофе", "кофи", "coffee", "cafe", "café", "bica"],
      hint: "Без него ты не разговариваешь, про это даже есть стикер ☕", fill: "кофе",
      comment: "Без кофе никуда ☕",
      sticker: "coffee", stickers: ["coffee", "paci"], reward: 3,
    },
    {
      type: "riddle", chapter: 1, tile: "ESTÁ NA COZINHA",
      riddle: "Сколько лет мы вместе? Можно цифрой 🗓",
      answers: ["8", "восемь", "eight", "oito"],
      hint: "Больше семи, меньше девяти 😏", fill: "8",
      comment: "8 лет, и это только начало ❤",
      sticker: "grumpy2", stickers: ["grumpy2", "sideeye"], reward: 3,
    },
    {
      type: "riddle", chapter: 1, tile: "DENTRO DO ARMÁRIO",
      riddle: "Что нам нужно было сказать на свадьбе в Грузии? 🇬🇪💍",
      answers: ["диах", "дьях", "диак", "дях", "дийах", "diakh", "diah", "diax", "diak", "დიახ"],
      wrong: { "да": "Почти! Но по-грузински 😉" },
      hint: "Это «да» по-грузински, звучит как «ди-а-х» 🇬🇪", fill: "диах",
      comment: "Диах! Мы сказали это друг другу 🥂",
      sticker: "wow", stickers: ["wow", "what"], reward: 3,
    },
    {
      type: "riddle", chapter: 1, tile: "ONDE MORA",
      riddle: "Как ты записана у меня в телефоне? 📱",
      answers: ["lovelylove", "лавлилав", "лавли", "lovely"],
      hint: "Два английских слова, и оба про любовь ❤", fill: "Lovely Love",
      comment: "Lovely Love, и никак иначе ❤",
      sticker: "serious", stickers: ["serious", "ski"], reward: 3,
    },
    {
      type: "riddle", chapter: 1, tile: "O ASPIRADOR",
      riddle: "Какого цвета была картина, с которой мы уехали из бара? 🖼",
      answers: ["син", "индиго", "navy", "нэви", "неви", "кобальт", "ультрамарин", "сапфир", "лазур", "blue", "azul"],
      hint: "Цвет ночного неба и глубокого океана 🌊", fill: "тёмно-синий",
      comment: "Тёмно-синяя! Лучший трофей из бара 🍸",
      sticker: "art", stickers: ["art", "turbo"], reward: 3,
    },
    {
      type: "phrase", chapter: 1, big: true,
      title: "Фраза собрана! 🇵🇹",
      text: "Прочитай, что получилось, и иди искать 👀",
      translation: "Твой подарок на кухне, в шкафу, где живёт пылесос 🧹",
      button: "Я нашла подарок! 🎁",
      sticker: "sideeye",
      achievement: "Полиглот 🇵🇹",
      foundTitle: "🎁 Подарок №1 найден!",
      foundText: "Открывай! А потом возвращайся: впереди ещё одна фраза.",
      emoji: "🎁", reward: 0,
    },

    // ---------- Мини-игра «Кто это?» ----------
    {
      type: "whois",
      title: "Кто это? 🔍",
      intro: "Перерыв между главами. Фото приближено до неприличия. Угадай, кто на нём.",
      rounds: [
        {
          photo: "photos/paulina.jpg",
          zoom: { x: 35, y: 36, scale: 7 },
          options: ["Данила", "Паулина", "Папа", "Котик из интернета"],
          correct: 1,
          reveal: "Паулина, 3 месяца. Босс этого дома 👑🍼",
        },
        {
          photo: "photos/danila.jpg",
          zoom: { x: 60, y: 43, scale: 4.5 },
          options: ["Дарт Вейдер", "Гонщик MotoGP", "Данила", "Паулина в шлеме"],
          correct: 2,
          reveal: "Данила. Без страха и упрёка 🏍💨",
        },
        {
          photo: "photos/us.jpg",
          zoom: { x: 61, y: 72.5, scale: 9 },
          options: ["Анджелина Джоли", "Самая красивая девушка", "Ты 😍", "Все ответы верны"],
          correct: [1, 2, 3],
          reveal: "Это ты. И да, все ответы верны 😍",
        },
        {
          photo: "photos/cat.jpg",
          zoom: { x: 64, y: 29.5, scale: 6 },
          options: ["Сова", "Злой мем из интернета", "Кошка, которая не одобряет твои ошибки", "Паулина утром"],
          correct: [1, 2],
          reveal: "Кошка твоих родителей из Питера. Даже оттуда она не одобряет твои ошибки 😾",
        },
      ],
      achievement: "Глаз-алмаз 👁",
      foundTitle: "Глаз-алмаз!",
      foundText: "Всех узнала. Теперь глава 2: вторая фраза и второй подарок 🎁",
      stickers: ["monday", "notimpressed"], reward: 3,
    },

    // ================= ГЛАВА 2: балкон =================
    {
      type: "riddle", chapter: 2, tile: "O SEGUNDO PRESENTE",
      riddle: "Ей 3 месяца, а она уже командует всем домом 👑🍼 Кто это?",
      answers: ["паулин", "paulin"],
      hint: "Наша маленькая босс, на «П»", fill: "Паулина",
      comment: "Паулина! Главная в доме 👑",
      sticker: "cheeks", stickers: ["cheeks", "fist"], reward: 3,
    },
    {
      type: "riddle", chapter: 2, tile: "ESTÁ NA VARANDA",
      riddle: "Какой был счёт на матче, где я сделал тебе предложение? ⚽💍",
      answers: ["33", "тритри", "ничья", "trestres", "threethree"],
      hint: "Ничья, и голов было много: по 3 у каждой команды", fill: "3:3",
      comment: "3:3 на поле, а главный приз выиграл я 💍",
      sticker: "run", stickers: ["run", "aaa"], reward: 3,
    },
    {
      type: "riddle", chapter: 2, tile: "DEBAIXO DAS FLORES",
      riddle: "В каком городе мы поженились? 🏰 Его называют городом любви, и там можно пожениться в любой день.",
      answers: ["сигнах", "сигнаг", "signag", "sighnag", "signakh", "სიღნაღ"],
      hint: "Город любви в Кахетии, начинается на «Сиг…»", fill: "Сигнахи",
      comment: "Сигнахи, город любви ❤",
      sticker: "witch", stickers: ["witch", "halloween"], reward: 3,
    },
    {
      type: "riddle", chapter: 2, tile: "DENTRO DO SACO",
      riddle: "Где я тебе написал в первый раз? 💬",
      answers: ["вк", "вконтакт", "контакт", "vk", "vkontakt"],
      hint: "Синяя соцсеть, две буквы", fill: "ВК",
      comment: "Спасибо, ВК 😄",
      sticker: "spa", stickers: ["spa", "dino"], reward: 3,
    },
    {
      type: "riddle", chapter: 2, tile: "CHEIO DE SACOS",
      riddle: "Кто у нас бывает то человеком-пауком, то лисом, то гонщиком, а ещё рисует лучше всех? 🕷🦊",
      answers: ["данил", "даня", "данюш", "даник", "danil", "danya"],
      hint: "Твой сын 😊", fill: "Данила",
      comment: "Данила! И у него для тебя кое-что есть 👀",
      sticker: "fox", stickers: ["cat", "fox"], reward: 3,
    },
    {
      type: "phrase", chapter: 2, big: true,
      title: "Вторая фраза! 🇵🇹",
      text: "Читай и беги искать 🏃‍♀️",
      translation: "Второй подарок на балконе, под цветами, в пакете с пакетами 🌸🛍",
      button: "Я нашла подарок! 🎁",
      sticker: "halloween",
      achievement: "Знаток португальского 🇵🇹",
      foundTitle: "🎁 Подарок №2 найден!",
      foundText: "Открывай! Остался последний, самый творческий подарок…",
      emoji: "🎁", reward: 0,
    },

    // ---------- Рисунок Данилы ----------
    {
      type: "found",
      title: "Маленький художник",
      riddle:
        "Последний подарок не спрятан. Он у одного очень важного человека в этом доме.\n\n" +
        "Он ниже меня ростом, бывает человеком-пауком и рисует лучше всех. " +
        "Найди его и скажи пароль: «Я тебя люблю!»",
      hint: "Это Данила 😊",
      button: "Данила отдал мне рисунок 🎨",
      sticker: "spidey",
      achievement: "Мама года 🎨",
      foundTitle: "🎨 Подарок №3 от Данилы!",
      foundText: "Он рисовал это специально для тебя. Обними художника покрепче!",
      foundPhoto: "photos/danila.jpg",
      foundPhotoCaption: "художник Данила, лично",
      emoji: "🎨", big: true,
      stickers: ["spider", "spidey", "siblings"], reward: 2,
    },

    // ---------- Финал ----------
    {
      type: "final",
      title: "С днём рождения, любимая!",
      polaroids: [
        { photo: "photos/us.jpg", caption: "мы 🤘", pos: "center 80%" },
        { photo: "photos/danila.jpg", caption: "Данила, гонщик", pos: "center 40%" },
        { photo: "photos/paulina.jpg", caption: "Паулина, босс 🍼" },
      ],
      kids: [
        { name: "Паулина", photo: "photos/paulina.jpg", text: "агу агу 🍼\n(перевод: мама, ты лучшая, покорми меня)" },
        { name: "Данила", photo: "photos/danila.jpg", text: "Мама, с днём рождения! Рисунок я уже отдал 🏍❤" },
      ],
      letter:
        "Я тебя очень сильно люблю. Прости, что мы иногда ссоримся.\n\n" +
        "Мы через столько прошли вместе, что даже представить сложно, " +
        "и побывали вместе в стольких местах. И с каждым днём ты становишься только лучше.\n\n" +
        "А дальше нас ждёт только светлое будущее — с деньгами, квартирами и Рендж Роверами. " +
        "И ещё у нас такие классные дети — Данила и Паулина.\n\n" +
        "С днём рождения, Lovely Love ❤",
      scheduleTitle: "Это ещё не всё 👀",
      schedule: [
        { time: "12:00", icon: "💐", text: "Приедут цветы" },
        { time: "14:00", icon: "🎂", text: "Приедет торт" },
      ],
      scheduleNote: "Так что далеко не уходи 😉",
      // Бонус в самом конце: стикерпак семьи
      stickerpack: {
        title: "🎁 Бонус: стикерпак нашей семьи",
        text: "Все 25 стикеров из игры теперь твои. Добавь их в Telegram или WhatsApp и отправляй всем 😎",
        telegramLink: "", // вставь сюда ссылку t.me/addstickers/... когда создашь пак
        telegramZip: "stickerpack/karina35-telegram.zip",
        whatsappZip: "stickerpack/karina35-whatsapp.zip",
      },
    },
  ],

  // 35 причин. Открываются по ходу игры (сумма reward у этапов = 35).
  reasons: [
    "Ты самая красивая.",
    "Ты самая умная.",
    "Ты самая добрая. Иногда 😏",
    "Твоя улыбка, от которой сразу светлеет утро.",
    "Как ты смеёшься — громко и по-настоящему.",
    "Ты потрясающая мама.",
    "Ты подарила мне Данилу и Паулину.",
    "Ты умеешь поддержать, когда мне трудно.",
    "Твои объятия — лучшее место на земле.",
    "Ты делаешь наш дом уютным.",
    "Твоё чувство юмора.",
    "Ты смеёшься над моими шутками. Даже над несмешными.",
    "Какая ты сонная и милая по утрам.",
    "С тобой можно молчать, и это совсем не неловко.",
    "Ты веришь в меня.",
    "Твоя забота в мелочах.",
    "Как ты рассказываешь истории, размахивая руками.",
    "С тобой интересно путешествовать.",
    "С тобой даже концерт в толпе — как свидание.",
    "Ты не боишься пробовать новое.",
    "Твой голос.",
    "Как ты любишь Данилу и Паулину.",
    "Ты сильнее, чем думаешь. Особенно в 3 часа ночи с Паулиной на руках.",
    "Твой вкус: в одежде, музыке, во всём.",
    "Ты умеешь радоваться мелочам.",
    "Ты меня вдохновляешь.",
    "Ты прощаешь мои косяки.",
    "Как ты смотришь на меня, когда думаешь, что я не вижу.",
    "Ты сказала «да» при счёте 3:3.",
    "За 8 лет со мной ты ни разу не дала мне заскучать.",
    "Ты мой лучший друг.",
    "Твои глаза.",
    "Ты делаешь меня лучше.",
    "Каждый наш год вместе лучше предыдущего.",
    "Просто потому что ты — это ты. И 35 тебе очень идёт.",
  ],
};
