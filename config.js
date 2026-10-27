/* Tilejo – the ONE file to edit for the paid unlock (deployed next to index.html as config.js).
   After creating the Gumroad product (see /workspace/pwa/gumroad/tilejo.md):
   1) GUMROAD_PRODUCT_ID: Gumroad > product > Content > License key block shows the product_id.
   2) BUY_URL: the product's public link (https://portugaldiary.gumroad.com/l/...).
   While either value is empty or still a placeholder, the whole game stays open (no broken paywall). */
window.GAME_CONFIG = {
  GAME: "tilejo",
  MODE: "gumroad",                 // "gumroad" = free part + key unlock · "free" = everything open
  GUMROAD_PRODUCT_ID: "iIYsh2utFOZBZ6dQi45HOQ==",          // e.g. "AbCdEf123456==" (fill in)
  BUY_URL: "https://portugaldiary.gumroad.com/l/tilejo-full",
  PRICE_LABEL: "2,99 €",
  INK: "#1d4e89",                  // colour of the unlock window
  MAX_USES: 5,                     // devices/browsers per key
  RECHECK_DAYS: 14,                // silent re-check (refunds), never counted as a new activation
  API_URL: "https://api.gumroad.com/v2/licenses/verify",
  TEXT: {
    pt: { title: "Tilejo completo",
          free: "Grátis: Portugal inteiro (25 painéis), o primeiro painel de cada coleção e o painel do dia.",
          gets: ["Os 151 painéis: Espanha, Marrocos, Países Baixos, Turquia, México, Itália, Irão e Usbequistão, Inglaterra, Brasil e Pavimentos do Mundo",
                 "Pagamento único, sem subscrição e sem anúncios",
                 "Funciona sem internet depois de ativado"] },
    en: { title: "Tilejo full game",
          free: "Free: all of Portugal (25 panels), the first panel of each collection and the Daily panel.",
          gets: ["All 151 panels: Spain, Morocco, the Netherlands, Türkiye, Mexico, Italy, Iran & Uzbekistan, England, Brazil and Floors of the World",
                 "One-time payment, no subscription, no ads",
                 "Works offline once activated"] }
  }
};
