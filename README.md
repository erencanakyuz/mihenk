# MİHENK

MİHENK, normal bir sosyal akışın kriz anında doğrulama ve yardım odaklı bir
deneyime dönüşmesini gösteren, tamamen yerel verilerle çalışan bir UI/UX
prototipidir.

- Backend ve gerçek kullanıcı hesabı yoktur.
- Gönderiler ve hesaplar kurgusaldır.
- Çalışma anında üçüncü taraf isteği yapılmaz.
- Kaynak uygulama vanilla HTML, CSS ve JavaScript’tir.
- Tek dosyalık dağıtım çıktısı dist/ altında üretilir.

## Çalıştırma

Node.js 20 veya daha yeni bir sürüm önerilir.

~~~bash
npm install
npm start
~~~

Ardından [http://127.0.0.1:8321](http://127.0.0.1:8321) adresini açın.
Geliştirme sunucusu yalnızca yerel makineye bağlanır.

| Rota | İçerik |
|---|---|
| / | Akış |
| /takip | Takip |
| /kriz | Kriz modu açık olarak doğrudan kriz akışı |
| ?demo=1 | Senaryolu prototip kontrol paneli |

dist/mihenk.html dosyası da doğrudan açılabilir. CSS, JavaScript ve yerel
görseller bu dosyaya gömülür; ağ isteği yapmaz.

## Komutlar

~~~bash
npm run bundle        # noscript içeriğini ve iki tek-dosya çıktısını üretir
npm run check:syntax  # kaynak JavaScript sözdizimini denetler
npm run contrast      # iki paletteki WCAG renk çiftlerini denetler
npm run verify        # gerçek Chromium ile temel akışları doğrular
npm run check         # yukarıdaki üretim ve doğrulama adımlarını birlikte çalıştırır
~~~

Klip üretimi isteğe bağlıdır ve ffmpeg gerektirir:

~~~bash
npm run capture -- --only=imdat --size=1280x720
~~~

Üretilen clips/ ve geçici .frames/ klasörleri özellikle Git dışında tutulur.
Yalnızca seçilmiş nihai medya daha sonra assets/demos/ altına elle
eklenmelidir.

## Yapı

~~~text
assets/img/             kaynak gönderi görselleri ve lisans notları
data/seed.js            kurgusal hesaplar ve gönderiler
scripts/app.js          kabuk, durum, rota, arama, modal ve sekmeler
scripts/feed.js         normal akış, paylaşım alanı ve etkileşimler
scripts/crisis.js       kriz akışı, filtreler ve paylaşım yönlendirmesi
scripts/imdat.js        yardım çağrısı akışı
scripts/demo.js         deterministik demo senaryoları
styles/                 token, yerleşim, akış, kriz ve düz-mod stilleri
tools/serve.mjs         güvenli yerel geliştirme sunucusu
tools/bundle.mjs        tek-dosya paketleyici
tools/gen-static.mjs    JavaScript kapalı belge üreticisi
tools/verify.mjs        tarayıcı doğrulaması
tools/contrast.mjs      kontrast denetimi
tools/capture.mjs       isteğe bağlı, deterministik klip üretimi
dist/                   Git’e dahil dağıtım çıktıları
docs/                   mimari ve sertleştirme kararları
~~~

Tarayıcıdaki yükleme sırası önemlidir: seed.js → app.js → diğer modüller.
Modüller ortak window.MIHENK alanını kullanır.

## Prototip davranışı

Normal akışlar oturum boyunca bağlı kalır ve kendi kaydırma konumlarını korur.
Kriz etkinleştirildiğinde üçüncü sekme ile sabit kriz kartı eklenir; kriz
sonlandığında ikisi de kaldırılır.

Kriz akışı dört doğrulama durumunu ve konu filtrelerini gösterir. Normal akışta
krizle ilişkili bir metin paylaşılırsa kullanıcıya kriz akışına yönlendirme
seçeneği sunulur; paylaşım zorla engellenmez.

Arama, aktif akıştaki yerel gönderileri filtreler. Beğeni, yeniden gönderim,
yanıt, takip ve panoya kopyalama etkileşimleri oturum içi durumla çalışır.
Backend gerektiren bildirim, mesaj, profil ve benzeri hedefler sahte bağlantı
gibi davranmak yerine açıkça devre dışıdır.

İmdat akışı bu prototipte yalnızca arayüz simülasyonudur; gerçek bir kuruma veri
göndermez. Düşük bant genişliği modu görsel ve hareketli öğeleri azaltır.
index.html içindeki noscript bölümü JavaScript kapalıyken de temel kriz
bilgilerini okunabilir tutar.

## İçerik ve görsel lisansları

Tüm hesaplar şablondur. Kurum adları temsilî kullanılır; kurumlarla bağlantı,
onay veya gerçek zamanlı bilgi iddiası yoktur. Gerçek kişisel veri, telefon
numarası veya açık adres bulunmaz.

Avatarlar kodla üretilen SVG şablonlarıdır. Gönderi fotoğrafları assets/img/
altında yerel tutulur. Kaynak ve lisans ayrıntıları assets/img/README.md
dosyasındadır. Yeni görsel ekleyen bir katkıcı dosyayı buraya koymalı, dürüst
bir alternatif metin yazmalı ve kaynak/lisans kaydını aynı yerde güncellemelidir.

## Güvenlik sınırı

Bu depo bir frontend prototipidir. Kimlik doğrulama, yetkilendirme, kalıcı veri,
gerçek zamanlı kriz doğrulaması veya acil yardım iletimi sağlamaz. Üretim
sistemi olarak kullanılması amaçlanmamıştır.
