# MİHENK

**Bir sosyal akışın, kriz anında doğrulanmış bilgiye ve yardım taleplerine öncelik
verecek şekilde kendi kendini yeniden şekillendirdiği bir arayüz.** TEKNOFEST 2026
NSosyal İnovasyon Yarışması için geliştirilen bir UI/UX prototipi.

İki biçimde çalışır: tek başına tarayıcıda, çalışma anında sıfır ağ isteğiyle
(`dist/mihenk.html`); ve çok kullanıcılı tatbikatlar için yalnızca yerel makinede
çalışan paylaşımlı bir sunucuyla (Node + SQLite) - roller, gizlilik ve moderatör
işlemleri bu ikincisinde denenir. Gerçek kullanıcı ve gerçek kriz verisi yok,
bütün hesaplar kurgusaldır.

<p>
  <img src="assets/demos/activation.gif" width="49%" alt="Kriz modu etkinleşiyor: normal akış, bildirim, sabit kart, yeni sekme">
  <img src="assets/demos/verification.gif" width="49%" alt="Kriz akışında dört doğrulama durumu ve filtre çipleri">
</p>
<p>
  <img src="assets/demos/imdat.gif" width="49%" alt="Yardım talebi akışı: ihtiyaç seçimi, konum, gözden geçirme, durum zinciri">
  <img src="assets/demos/tab-switch.gif" width="49%" alt="Ana akış ile Kriz Var sekmesi arasında geçiş, palet çapraz geçişi">
</p>

## Neden var

Chuai ve arkadaşlarının (2026, *Nature Communications*) bulgusu: X'te doğruluk
denetimi yapılmış gönderilerin **repost yarı ömrü 5,75-6,25 saat**, topluluk
notunun görünür hale gelmesi ise **ortalama 62,9 saat** (medyan 18,1 saat).
Faydalı notların yalnızca **%13,5'i** gönderi yarı ömrüne ulaşmadan önce
görünüyor. Afette bu farkın bedelini ilk saatlerde verilen kararlar ödüyor.

Piyasadaki çözümler üç kalıba giriyor: platformlar bir banner/ayrı sayfa
açıyor ama **ana akış ve sıralama algoritması aynı kalıyor** (Meta Safety
Check, Google SOS Alerts); bazıları sonradan **etiket/not** ekliyor (X
Community Notes); bazıları **bağımsız bir uygulama** olarak duruyor (Ushahidi,
afetharita.com) - ve afet anında kimse yeni bir uygulama indirmiyor.

MİHENK bu üçünü de yapmıyor: **platformun kendi ana bilgi akışı**, kriz
süresince doğrulanmış kaynaklara öncelik verecek şekilde yeniden yapılanıyor.
Ayrı bir katman değil, ürünün kendisi mod değiştiriyor.

## Kriz Var sekmesi ve üç sistem

Kriz tespit edilince arayüz üç adımda dönüşür: bildirim, ana akışın üstüne
sabitlenen kriz kartı, ardından beliren üçüncü sekme - **Kriz Var**. Sekmenin
içinde üç sistem çalışır:

- **Yardım talepleri.** Dört adımlı sihirbaz: ihtiyaç türü, konum, kişi sayısı,
  beyan. Adres ve telefon **ayrı alanlardır** ve her biri için görünürlük
  seçilir; varsayılan "Yalnızca moderatörler". Talep tam sayfa açılır; iki
  kanalı vardır: "Yetkililerle iletişim" (talep sahibi ve gönüllü moderatörler,
  mesaj başına özel/herkese açık seçimi) ve "Topluluk desteği" (herkese açık,
  destek önerileri).
- **Bilgi paylaşımları.** Doğrulama etiketini gönüllü moderatör değiştirir -
  gerekçe ve onay penceresiyle. Topluluk tartışmasında en çok onaylanan yorum
  "Topluluk notu" olarak sabitlenir. Kurumsal duyurulara yorum yazılamaz.
  Yapay zekâ doğrulaması bugün yalnızca arayüzdeki yer tutucudur (TODO).
- **Düşük bant genişliği modu.** Tek tıkla siyah-beyaz, tek sütun "Terminal"
  görünümü: görseller, hareketler ve gölgeler kapanır, **hiçbir işlem
  kaybolmaz**. Tam sürüm ~470 KB, düz mod ~11 KB.

## Öne çıkanlar

- **Kademeli kriz etkinleştirme.** Toast → sabitlenmiş kart (FLIP ile aşağı
  iten posta akışı) → üçüncü sekmenin belirmesi, tek bir anda değil, sahnelenmiş
  üç adımda.
- **Dört doğrulama durumu**, her biri kendi rengi + ikonu + metniyle, yalnızca
  renge dayanmadan okunur: Doğrulanmış, Resmî Kurum, Doğrulanmamış, Çelişkili.
- **Beyan esaslı, cezalandırmayan model.** Kriz akışına ne gireceğine kullanıcı
  karar verir; ana akışta krizle ilgili bir şey paylaşılırsa yönlendirme
  önerilir, asla engellenmez.
- **Roller ve gizlilik, testle.** Sunucu her görünümü kişiye göre üretir;
  yetkisi olmayana özel alan, özel mesaj ya da bunların varlığına dair bir iz
  gitmez. `lab/request-access-check.mjs` bunu **86 otomatik erişim denemesiyle**
  sahip, moderatör, bölge dışı moderatör, katılımcı ve gözlemci gözünden
  doğrular.
- **İki palet, tek WCAG 2.2 AA denetimi.** `tools/contrast.mjs`, gerçek token
  değerlerini okuyup 27 çift üzerinde ölçüyor - "iyi görünüyor" değil, sayı.
- **Kare kare deterministik demo kayıtları.** `tools/capture.mjs`, sayfanın
  saatini gerçek zamandan değil sanal saatten ilerletiyor; aynı senaryo her
  çalıştırmada birebir aynı kareleri üretiyor (bkz. yukarıdaki GIF'ler).
- **Sıfır ağ isteği, JavaScript kapalıyken de çalışır.** `dist/mihenk.html`
  tek dosyada her şeyi taşıyor; `index.html`'in `<noscript>` bölümü JS
  olmadan da kriz durumunu okunabilir tutuyor.

## Çalıştırma

Yerel prototip için Node.js 20 veya daha yenisi yeterlidir. Paylaşımlı tatbikat
sunucusu `node:sqlite` kullandığı için **Node.js 22+** ister.

```bash
npm install
npm start
```

Ardından [http://127.0.0.1:8321](http://127.0.0.1:8321) adresini açın.
Geliştirme sunucusu yalnızca yerel makineye bağlanır.

| Rota | İçerik |
|---|---|
| `/` | Ana akış |
| `/kriz` | Kriz modu açık olarak doğrudan Kriz Var sekmesi |
| `?demo=1` | Senaryolu prototip kontrol paneli |

`dist/mihenk.html` dosyası da doğrudan çift tıkla açılabilir - CSS, JavaScript
ve yerel görseller tek dosyaya gömülü, hiçbir isteğe ihtiyaç duymaz.

### Paylaşımlı tatbikat (Node 22+)

Rolleri, gizlilik projeksiyonlarını ve moderatör işlemlerini birden fazla hesapla
denemek için:

```bash
npm run rehearsal          # katılımcı 8322, operatör paneli 8323
npm run rehearsal:control -- create adversarial-crisis
npm run rehearsal:control -- join <runId> "Deniz" participant
npm run rehearsal:control -- join <runId> "Moderatör" request_moderator
npm run rehearsal:control -- start <runId>
```

`join` komutu tek kullanımlık bir oturum bağlantısı döndürür. Roller:
`participant`, `request_moderator`, `moderator`, `observer` - moderatör yetkisi
bölge kapsamıyla sınırlanabilir.

## Komutlar

```bash
npm run bundle        # noscript içeriğini ve iki tek-dosya çıktısını üretir
npm run check:syntax  # kaynak JavaScript sözdizimini denetler
npm run contrast      # iki paletteki WCAG renk çiftlerini denetler
npm run verify        # gerçek Chromium ile temel akışları doğrular
npm run check         # yukarıdaki üretim ve doğrulama adımlarını birlikte çalıştırır
npm run measure       # paket boyutu, çalışma anı ve arayüz ölçümleri

node lab/request-access-check.mjs                  # 86 erişim denemesi (Node 22+)
npm run capture -- --only=imdat --size=1280x720    # tek bir senaryonun klibi
```

Klip üretimi isteğe bağlıdır ve ffmpeg gerektirir. Üretilen `clips/` ve geçici
`.frames/` klasörleri Git dışında tutulur; seçilmiş nihai klipler
`assets/demos/` altında tutulur (bkz. `assets/demos/README.md`).

## Yapı

```text
assets/demos/              README'deki seçilmiş GIF'ler ve nasıl üretildikleri
assets/fonts/              self-host edilmiş başlık fontu
assets/img/                kaynak gönderi görselleri ve lisans notları
data/seed.js               kurgusal hesaplar, gönderiler, avatar/görsel şablonları
data/catalog.js            ihtiyaç türleri, bölge ve konu listeleri
scripts/app.js             kabuk, durum, rota, arama, modal, sekmeler, navigasyon
scripts/feed.js            normal akış, paylaşım alanı ve etkileşimler
scripts/crisis.js          kriz akışı, filtreler, kartlar, paylaşım yönlendirmesi
scripts/imdat.js           yardım talebi sihirbazı
scripts/request-page.js    talep ve bilgi paylaşımı sayfası
scripts/request-thread.js  mesaj kanalları, yanıtlar, görünürlük seçimi
scripts/ai-verification.js yapay zekâ doğrulaması yer tutucusu
scripts/plain-toggle.js    düşük bant genişliği modu anahtarı
scripts/transport.js       yerel ve paylaşımlı sunucu adaptörleri
scripts/demo.js            deterministik demo senaryoları
server/                    tatbikat sunucusu: depo, dünya durumu, görünümler, erişim
lab/                       tatbikat koşucusu, model katılımcılar, erişim ve moderasyon denemeleri
styles/tokens.css          renk paleti, tipografi, tüm tasarım token'ları
styles/                    yerleşim, akış, kriz, talep sayfası ve düz mod stilleri
tools/                     sunucular, paketleyici, kontrast, ölçüm ve tatbikat araçları
docs/                      sunum notları, uygulama planı, incelemeler, deney kayıtları
dist/                      Git'e dahil tek-dosya dağıtım çıktıları
```

Tarayıcıdaki yükleme sırası önemli: `seed.js` → `app.js` → diğer modüller.
Modüller ortak `window.MIHENK` alanını paylaşır; framework, bundler veya build
adımı yok - düşük bant genişliği modunun HTML'e düz metin olarak geri
düşebilmesi bunu gerektiriyor.

## Tasarım yönü

Görsel kimlik bilinçli bir tercih: X (Twitter) referansıyla başladı - ilk
hedef etkileşim kalitesini kanıtlamaktı - sonra kendi kimliğine ("Taş &
Sinyal": soğuk taş grisi zemin, İznik turkuazı vurgu; kriz modunda sıcak
amber-terrakotaya kayan aynı aile) geçti. Rozetler ve durum göstergeleri her
zaman **solid dolgu**, saydam/tint yüzey kullanılmıyor; gönderiler X'in
uçtan uca çizgiyle ayrılan listesi yerine aralıklı, sınırlı kartlar.

Düşük bant modunun görsel dili için dört alternatif değerlendirildi (Terminal,
Kâğıt, İçindekiler, Çerçeve); Terminal seçildi - tek bir amber vurgu yalnızca
sayfanın birincil eylemine ayrıldı, diğer eylemler altı çizili metin.

## İçerik ve lisanslar

Tüm hesaplar kurgusal şablon hesaplardır - gerçek kişi, gerçek telefon
numarası veya açık adres yok. `AFAD`, `Valilik`, `Kızılay` ve `Meteoroloji`
temsilî hesaplardır; bu kurumlarla bağlantı, onay veya gerçek zamanlı bilgi
iddiası taşımazlar. Avatarlar kodla üretilen deterministik SVG şablonlardır;
gönderi fotoğrafları `assets/img/` altında yerel tutulan, kaynağı ve lisansı
`assets/img/README.md`'de kayıtlı gerçek fotoğraflardır.

## Kapsam

Bu depo bir arayüz prototipidir. Kapsam bilinçli olarak arayüz ve etkileşim
tasarımıyla sınırlı: gerçek kriz tetikleme, kurumsal kimlik doğrulama (W3C
Verifiable Credentials), içerik kökeni denetimi (C2PA), model tabanlı doğrulama
ve acil yardım iletimi bu depoda **yoktur** - teknik raporda iş paketi olarak
tanımlıdırlar. Paylaşımlı tatbikat sunucusu yalnızca yerel makinede, kurgusal
hesaplarla çalışan bir deneme ortamıdır; üretim sistemi olarak kullanılmak üzere
tasarlanmadı.
