# React Native + Expo Migrasyon Planı

**Kaynak:** Var Mısın Yok Musun (HTML / CSS / jQuery web oyunu)  
**Hedef:** React Native + Expo  
**Kapsam:** Analiz ve taşıma planı — bu belgede uygulama kodu yazılmaz.

---

## 1. Mevcut dosya yapısı

```
.
├── index.html              # Mark-up: layout, ödül panelleri, 20 kutu, teklif overlay
├── mediaQuery.css          # Boş breakpoint iskeleti (index.html'de bağlı değil)
├── README.md
├── css/
│   ├── style.css           # Oyun görünümü (kutular, para paneli, overlay, animasyonlar)
│   ├── bootstrap.css       # Vendor — grid/card/btn için
│   └── bootstrap-grid.css  # Vendor
├── js/
│   ├── script.js           # Tüm oyun akışı + UI manipülasyonu (~296 satır)
│   ├── jquery-3.5.0.js     # Vendor
│   ├── bootstrap.js        # Vendor
│   └── popper.min.js       # Vendor
└── img/
    ├── favicon / PWA ikonları
    ├── giphy.phone.gif     # Kullanılmıyor (kodda referans yok)
    └── giphy.kkbold.gif    # Kullanılmıyor
```

**Özet:** Tek sayfalık, build’siz, jQuery + Bootstrap tabanlı bir istemci oyunu. Framework yok; state store yok; modül ayrımı yok.

---

## 2. Oyun mantığı vs UI — ayrılık değerlendirmesi

### Sonuç (kısa)

| Katman | Ayrık mı? | Not |
|--------|-----------|-----|
| State | Hayır | Global değişkenler + DOM attribute’ları |
| Skor / ödül havuzu | Hayır | `odulListe` DOM element dizisi |
| Kart/kutu “çekme” | Hayır | Rastgele seçim + jQuery animasyon aynı fonksiyonda |
| Tur / banka teklifi | Kısmen | Eşikler ve formül çıkarılabilir; tetikleme DOM sayımına bağlı |
| UI / görsel | Hayır | HTML + CSS + jQuery `.animate()` / `.css()` / `.show()` |

**Genel hüküm:** Mantık ve UI **iç içe**. `script.js` hem kuralları hem DOM’u yönetiyor; “pure game engine” diye taşınacak bir katman yok. Taşımada önce mantığın **çıkarılması / yeniden yazılması**, sonra RN UI’nin sıfırdan kurulması gerekir.

### 2.1 Implicit state modeli (şu an)

| Kavram | Nerede tutuluyor | Tip |
|--------|------------------|-----|
| Kalan ödüller | `odulListe` (global) | `HTMLElement[]` — `odul` attribute’undan okunur |
| Banka teklifi | `bankaTeklifi` (global) | `number` |
| Açılmamış kutular | `$("div[data-num]").length` | DOM sorgusu |
| Oyuncu kutusu | `data-senin-kutun` attribute | DOM |
| Açılmış ödül görseli | `.acildi` class + width animasyonu | CSS/DOM |
| Oyun fazı | `display` / `visibility` / overlay yüksekliği | CSS durumu |
| Yeniden başlatma | `location.reload()` | Sayfa yenileme |

State’in büyük kısmı **DOM’da**. Bu yüzden `script.js` Expo’ya birebir kopyalanamaz.

### 2.2 Saf mantık olarak çıkarılabilir kurallar

Aşağıdakiler UI’dan bağımsız kurallar olarak belgelenebilir / `game/` modülüne taşınabilir:

1. **Ödül tablosu (20 değer)**  
   `1, 2, 5, 10, 25, 50, 100, 250, 500, 750, 1000, 2000, 5000, 10000, 25000, 35000, 50000, 100000, 250000, 500000`

2. **Kutu sayısı:** 20 sabit kutu; oyuncu biri seçer; geri kalanlar açılır.

3. **Ödül ataması:** Her açılışta kalan ödül listesinden **rastgele bir ödül** çıkarılır (`Math.random` + `splice`). Kutuya önceden sabit ödül atanmaz; kutu numarası ile ödül **runtime’da eşleşir**.

4. **Banka teklifi eşikleri** (kalan `data-num` kutusu sayısına göre, seçim sonrası):  
   - `15` → teklif (oyuncu kutusu seçildikten sonra 5 kutu açılmış)  
   - `11` → teklif  
   - `7` → teklif  
   - `4` → teklif  
   - `2` → son teklif (+ “KUTUNU AÇ” yolu)

5. **Teklif formülü:**  
   `Math.round((kalanÖdüllerToplamı / kalanÖdülSayısı) * 0.75)`

6. **Sonuç:**  
   - VARIM → `bankaTeklifi` kazanılır  
   - Son kutuya kadar YOKUM → kalan tek ödül kazanılır  

7. **Renk eşiği (görsel kural, veri olarak taşınabilir):** ödül `<= 750` mavi, aksi kırmızı.

### 2.3 UI’ya sıkı bağlı kısımlar (mantık değil)

`script.js` içindeki fonksiyonların çoğu UI:

| Fonksiyon | Rol |
|-----------|-----|
| `kKutuInaktif` / `kKutuAktif` | z-index + arka plan rengi (tıklama kilidi) |
| `tekTitreme` / `telTitret` | Telefon sallanma animasyonu |
| `oduluGoster` | Kutu kapak/gövde animasyonu + ödül yazısı + para paneli animasyonu |
| `bankaTeklifiniGoster` | Overlay, telefon, buton bağlama + teklif hesabı |
| `sonKutuIslemleri` / `sonKutuyuAc` / `overlayPage` | Zamanlanmış UI sekansı |
| `varimTiklandi` | Kazanç metni + reload |

`index.html` ödül listesini ve 20 kutuyu **statik mark-up** olarak tutuyor; `style.css` tüm görünümü tanımlıyor. Bootstrap grid/card/btn sınıfları layout için kullanılıyor; Bootstrap JS bileşeni pratikte kullanılmıyor.

---

## 3. Dosya bazında taşıma kararı

### 3.1 Birebir taşınabilir (veya neredeyse)

| Dosya / varlık | Karar | Açıklama |
|----------------|-------|----------|
| Ödül değerleri (`index.html` `.para[odul]`) | **Veri olarak taşınır** | Dosya değil; sabit dizi/JSON olarak kopyalanır |
| Teklif formülü + eşikler (`script.js` içinden) | **Mantık olarak taşınır** | Satır satır kopya değil; pure fonksiyonlara ayıklanır |
| `img/android-chrome-*.png`, `apple-touch-icon.png` | **Opsiyonel asset** | Expo `app.json` / `icon` için kullanılabilir |
| `README.md` oyun kuralları metni | **Dokümantasyon** | Kurallar Expo projesine taşınabilir |
| MIT / proje kimliği | **Korunur** | — |

**Gerçek anlamda “birebir `.js` / `.html` / `.css` dosyası kopyala-çalıştır” yoktur.** Closest-port: sabitler + formül + kurallar.

### 3.2 Yeniden yazılmalı

| Dosya | Neden | Expo karşılığı (öneri) |
|-------|-------|-------------------------|
| `js/script.js` | jQuery + DOM state; RN’de yok | `src/game/*` (pure) + React state/hooks veya Zustand/Context |
| `index.html` | DOM ağacı | `App.tsx` + ekran/bileşen ağacı |
| `css/style.css` | CSS DOM modeli | `StyleSheet` / NativeWind / vs. |
| `mediaQuery.css` | Boş + web media query | `useWindowDimensions` / Flexbox |
| `css/bootstrap*.css` | Web grid/utility | RN layout (Flexbox); Bootstrap yok |
| `js/jquery-3.5.0.js` | DOM kütüphanesi | Kullanılmaz |
| `js/bootstrap.js`, `popper.min.js` | Web UI | Kullanılmaz |
| Font Awesome CDN | Web ikon | `@expo/vector-icons` (FontAwesome) |
| jQuery `.animate()` | Web animasyon | `react-native-reanimated` / `Animated` / `LayoutAnimation` |
| `location.reload()` | Web reset | State’i initial’e döndür |

### 3.3 Kullanılmayan / taşımaya değmez

| Dosya | Not |
|-------|-----|
| `img/giphy.phone.gif`, `img/giphy.kkbold.gif` | Kodda referans yok; istenirse telefon ekranı için yeniden entegre edilebilir |
| `mediaQuery.css` | Boş; taşıma değeri yok |
| Vendor Bootstrap/jQuery/Popper | Expo stack’ine alınmaz |

---

## 4. Önerilen hedef mimari (Expo)

Mantığı UI’dan **zorunlu** ayır:

```
src/
  game/
    constants.ts      # PRIZES[], OFFER_THRESHOLDS, OFFER_MULTIPLIER (0.75)
    types.ts          # GamePhase, Box, Prize, GameState
    engine.ts         # createGame, selectPlayerBox, openBox, computeOffer, accept/reject
    selectors.ts      # remainingPrizes, isOfferTurn, canOpenBox
  store/ veya hooks/
    useGame.ts        # React state / reducer — engine çağırır
  components/
    PrizeBoard.tsx    # Sol/sağ para paneli
    BoxGrid.tsx       # 20 kutu
    CaseReveal.tsx    # Büyük kutu açılış alanı
    OfferModal.tsx    # Banka teklifi overlay (VARIM / YOKUM)
    StartScreen.tsx
  theme/
    colors.ts         # mavi #3abbed, kırmızı #ec4743, yeşil #2aa767, lavanta zemin
  App.tsx
```

### 4.1 Önerilen `GameState` (DOM’suz)

```ts
type GamePhase =
  | "start"
  | "pick_player_box"
  | "opening"
  | "offer"
  | "final_offer"
  | "reveal_player"
  | "won_deal"
  | "won_case";

type GameState = {
  phase: GamePhase;
  boxes: { id: number; opened: boolean; isPlayer: boolean }[];
  remainingPrizes: number[];   // karışık / rastgele çekilen havuz
  lastOpenedPrize: number | null;
  lastOpenedBoxId: number | null;
  currentOffer: number | null;
  winnings: number | null;
};
```

Mevcut davranışla uyum için: kutu–ödül eşlemesi önceden sabitlenmeyebilir; her `openBox` kalan havuzdan rastgele çeker (bugünkü `odulListe.splice` modeli).

### 4.2 UI katmanı sorumluluğu

- Sadece `GameState` okur, aksiyon dispatch eder  
- Animasyon süreleri UI’da kalır (mevcut `setTimeout` / jQuery süreleri: ~400–3500 ms)  
- Teklif overlay’si `Modal` veya tam ekran `View` olur  

---

## 5. Davranış eşleme kontrol listesi

Migrasyonda birebir oynanış için doğrulanacaklar:

- [ ] 20 ödül, iki renk grubu (≤750 / >750)
- [ ] Önce oyuncu kutusu seçimi; seçilen kutu “SENİN KUTUN”
- [ ] Diğer kutulara tıklayınca rastgele kalan ödül gösterimi
- [ ] Para panelinde açılan ödülün “küçülerek” işaretlenmesi
- [ ] Teklif turları: kalan açılabilir kutu 15 / 11 / 7 / 4 / 2
- [ ] Teklif = ortalama × 0.75 (yuvarlama)
- [ ] VARIM → teklif kazanılır, yeni oyun
- [ ] YOKUM → devam
- [ ] Son teklifte YOKUM / “KUTUNU AÇ” → oyuncu kutusu açılır, kalan ödül kazanılır
- [ ] Animasyonlu telefon / teklif sunumu (görsel parity isteğe bağlı)

---

## 6. Riskler ve teknik borç (migrasyon öncesi bilinmeli)

1. **DOM = state:** Mevcut kod test edilemez pure mantık sunmuyor; RN’ye taşırken refactor şart.  
2. **Event handler birikimi:** `.varim` / `.yokum` her teklifte yeniden `.click` bağlanıyor; RN’de tek handler + `phase` ile çözülmeli.  
3. **`dataNumDom.length` zamanlaması:** Sayaç, attribute silinmeden önce alınıyor; eşikler bu sıraya bağlı — engine’de açık `openedCount` kullanın.  
4. **Ödül–kutu eşlemesi runtime:** Klasik “kutuya önceden ödül koy” modelinden farklı; kasıtlıysa korunmalı.  
5. **Bootstrap / jQuery bağımlılığı:** Görünümün çoğu custom CSS; Bootstrap’siz yeniden layout kolay.  
6. **`mediaQuery.css` bağlı değil:** Responsive kurallar aslında `style.css` içinde.

---

## 7. Taşıma sırası (kod yazmadan plan)

1. **Expo iskeleti** oluştur (`create-expo-app`), TypeScript.  
2. **`game/engine` + constants** — mevcut kuralları pure fonksiyonlarla yeniden yaz; birim test ile formül/eşik doğrula.  
3. **Minimal UI** — Start → kutu seç → aç → teklif → bitiş (animasyonsuz).  
4. **Görsel parity** — PrizeBoard, CaseReveal, OfferModal, renkler, telefon animasyonu.  
5. **Polish** — ikonlar, splash, haptics (opsiyonel), kullanılmayan gif’leri bilinçli ekle veya bırak.  
6. **Web build** (isteğe bağlı) — Expo Web ile eski tarayıcı demosuna yaklaşım.

---

## 8. Dosya → aksiyon özeti

| Kaynak | Aksiyon |
|--------|---------|
| `js/script.js` (kurallar) | **Yeniden yaz** → `src/game/engine.ts` (+ constants) |
| `js/script.js` (UI/animasyon) | **Yeniden yaz** → RN bileşenleri + Reanimated |
| `index.html` | **Yeniden yaz** → React Native view ağacı |
| `css/style.css` | **Yeniden yaz** → StyleSheet / theme |
| Ödül listesi (HTML) | **Taşı (veri)** → `constants.ts` |
| `img/*` ikonlar | **Taşı (asset)** → Expo icon |
| `img/giphy.*.gif` | **Karar bekler** (şu an dead code) |
| jQuery / Bootstrap / Popper | **Bırak** |
| `mediaQuery.css` | **Bırak** |
| `README.md` | **Güncelle** (kurulum: Expo) |

---

## 9. Sonuç

Bu repo **mantık ve UI’yi ayırmamış** bir jQuery oyunu. React Native + Expo’ya geçişte:

- **Birebir taşınacak dosya neredeyse yok.**  
- **Taşınacak olan:** ödül tablosu, teklif formülü, tur eşikleri, oyun akışı kuralları ve (opsiyonel) ikon asset’leri.  
- **Yeniden yazılacak olan:** tüm `script.js` etkileşimi, tüm HTML yapısı, tüm CSS, tüm vendor web stack.

Migrasyonun kritik adımı, DOM’a gömülü state’i pure bir `GameState` + engine’e çıkarmak; UI bundan sonra ince bir kabuk olarak kalmalı.
