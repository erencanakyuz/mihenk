# MİHENK — Sunum Notları (Kriz Var sekmesi ve üç ana sistem)

> **SUNUMDAN ÖNCE OKU.** Bu belge sunumun ana kaynağıdır. Sistem burada anlatıldığı gibi
> tasarlandı ve kodlandı (dal: `feature/request-thread-page`, 18 Eylül 2026). Depodaki
> diğer belgeler (README, `docs/HELP_REQUEST_IMPLEMENTATION_PLAN.md`, `docs/reviews/*`,
> `docs/hardening-*.md`, `docs/agent-experiment-*.md`, `docs/experiments/`) **ek kaynaktır**:
> birebir uymadığımız yerler var. Bir yerde bu belgeyle çelişirlerse **bu belge geçerlidir**;
> ama sunumda bir bölümü doldurmak, rakam vermek ya da derinleştirmek gerekirse oradan
> fikir alınıp bunun üstüne eklenebilir.

> **Sunumu hazırlayan yapay zekaya / kişiye talimat.**
> - Hız önemli. Bölümleri paralel ajanlara böl (ör. Fable 5.1 veya Opus alt ajanları:
>   biri slayt metinleri, biri görseller, biri demo senaryosu). Test, doğrulama koşturma
>   ya da kod okuma **yapma**; bu belgede yazanı doğru kabul et.
> - `[SS-n]` işaretli yerlere **ekran görüntüsü yerleştirilecek**. Uygulamadan çekmek
>   gerekmiyor: tarif edilen ekranı **mock (taslak görsel) olarak üret**, gerçek
>   arayüzün dilini kullan (koyu arka plan `#1b1e27`, mavi vurgu `#6bb9ff`, kırmızı
>   "Yardım talebi oluştur" `#b8374c`, yeşil "Bilgi paylaş" `#1f7f57`, Kriz Var sekmesi
>   turuncu-amber `#f2a154`, doğrulama renkleri: Resmî Kurum mavi-gri `#7fa8cf`,
>   Doğrulanmış yeşil `#7fbf8f`, Doğrulanmamış amber `#d9ab4a`, Çelişkili kırmızı
>   `#e0604a`; başlık fontu Archivo, gövde sistem fontu). Türkçe arayüz metinlerini bu
>   belgedeki haliyle, tırnak içinde verildiği gibi kullan. Amacımıza uygun, temiz,
>   sağlam görünsün; olmayan bir özellik ekleme.
> - "TODO" yazan yerler yol haritasıdır; sunumda "planlanan" diye anlatılır, "yapıldı"
>   denmez.

---

## 1. Tek cümlelik özet

MİHENK, bir sosyal akışın kriz anında **kendi ana akışını** doğrulanmış bilgiye ve yardım
taleplerine öncelik verecek şekilde yeniden şekillendirdiği bir arayüz prototipidir:
kriz anında ortaya çıkan ayrı bir **Kriz Var** sekmesi, bu sekmenin içinde **yardım
talepleri**, **bilgi paylaşımları** ve tüm projenin etrafında döndüğü **düşük bant
genişliği modu**.

## 2. Problem ve neden bu yaklaşım

- Chuai ve arkadaşları (2024, *Nature Communications*): bir gönderi viral etkisinin
  yarısını **5,75–6,25 saatte** üretiyor; Community Notes'un ortalama not ekleme
  gecikmesi **61,4 saat**. Afette bu fark arama-kurtarmanın altın saatlerini yutuyor.
- Piyasadaki üç kalıp: banner/ayrı sayfa açan ama ana akışı değiştirmeyen platformlar
  (Meta Safety Check, Google SOS Alerts); sonradan etiket ekleyenler (X Community
  Notes); bağımsız uygulamalar (Ushahidi, afetharita.com) — afet anında kimse yeni
  uygulama indirmiyor.
- MİHENK farkı: ayrı bir katman değil, **ürünün kendisi mod değiştiriyor**. Normal akış
  bozulmuyor; kriz akışı ayrı sekmede, karışmıyor.

## 3. Kriz Var sekmesi (omurga)

Kriz tespit edilince arayüz üç adımda dönüşür: bildirim (toast) → akışın üstüne
sabitlenen kriz kartı → **üçüncü sekme "Kriz Var"** belirir. Sekme turuncu-amber
vurguludur (ciddiyet rengi; mavi olan normal akıştan ayrışır). Sekme çubuğu aşağı
kaydırınca da görünür kalır; seçili sekmeye tekrar basmak en üste çıkarır ve akışı
günceller.

Sekmenin üstünde bir **kriz kartı**: küçük etiket "Kriz bilgi merkezi", olay başlığı
("Kahramanmaraş depremi"), alt satır "Bölgeni seç, güvenilir bilgiyi takip et." ve iki
büyük düğme: kırmızı **"Yardım talebi oluştur"**, yeşil **"Bilgi paylaş"**. Kartın altında
düşük bant modu anahtarı (bkz. §6), sonra filtre çipleri:
**Resmî · Yardım · Doğrulanmış · Doğrulanmamış** (hiçbiri varsayılan basılı değil; basılı
çipe tekrar basınca tam listeye dönülür), bölge ve konu seçiciler, arama.

Sol menü sadeleşti: **Ana Akış**, **Yardım taleplerim · N**, **Bilgi paylaşımlarım · N**
(kişinin kendi işleri belirgin), Profil, Gönder. "Takip" sekmesi kaldırıldı.

Her bölümün üstünde renkli, "Anladım" ile kapanan kısa bir açıklama şeridi var
("Bölgeden gelen tüm paylaşımlar. Paylaşmadan önce doğrulama etiketine bak." gibi);
kapatılan şerit hatırlanır.

Dört doğrulama durumu her kartta metin + ikonla, renge bağımlı olmadan okunur:
**Resmî Kurum, Doğrulanmış, Doğrulanmamış, Çelişkili**.

> **[SS-1] Kriz Var sekmesi, masaüstü.** Sol menü (Ana Akış / Yardım taleplerim · 1 /
> Bilgi paylaşımlarım / Profil / Gönder), üstte "Akış | Kriz Var" (Kriz Var turuncu),
> kriz kartı, altında düşük bant anahtarı satırı, dört filtre çipi, bölge/konu
> seçicileri, altta "Bölgeden güncellemeler" ve ilk açıklama şeridi.
>
> **[SS-2] Aynı ekran telefonda (390 px).** Kart, alt alta iki düğme, iki satıra sığan
> çipler, alt gezinme çubuğu.

## 4. Sistem 1 — Yardım talepleri

### 4.1 Talep oluşturma (sihirbaz, 4 adım)
1. **İhtiyaç türü**: Arama kurtarma / Sağlık / Barınma ve ısınma / Gıda ve su / Ulaşım
   (birden fazla seçilebilir).
2. **Konum**: ilçe seçimi + **"Herkese açık yer tarifi"** (mahalle, park gibi). Ayrı,
   katlanır bir kutuda **özel bilgiler**: ayrıntılı adres ve telefon, her biri için
   görünürlük seçimi **"Yalnızca moderatörler"** (varsayılan) veya **"Herkese açık"**.
   "Konumdan emin değilim, devam et" seçeneği belirsizliği korur, konumu silmez.
3. **Kişi sayısı** (bilinmiyorsa boş) ve **beyan** (herkese açık serbest metin; kutuda
   "Özel adres ve telefonu buraya yazmayın." uyarısı).
4. **Gözden geçirme**: ihtiyaç, herkese açık konum, adres tarifi (varsa, görünürlüğüyle),
   telefon (varsa, görünürlüğüyle), kişi sayısı, beyan; "Kriz Var akışı · Doğrulanmamış
   olarak başlar" notu. Talep oluşunca "Taleplerime git" doğrudan talep sayfasını açar.

> **[SS-3] Sihirbaz 2. adım** (ilçe, herkese açık yer tarifi, açılmış "Özel bilgiler ve
> görünürlük" kutusu: adres + "Yalnızca moderatörler", telefon + "Yalnızca
> moderatörler").
> **[SS-4] Sihirbaz 4. adım gözden geçirme** tablosu.

### 4.2 Akıştaki talep kartı
Üst satırda kişi, zaman ve sağda durum rozeti **"Talep açık" / "Talep kapalı"**;
doğrulama rozeti; talep sahibinin kendi sözleri (4 satıra kadar); **ihtiyaç çipleri**
("Barınma ve ısınma", "Gıda ve su") ve **kişi sayısı**; konum satırı (ilçe · herkese
açık yer tarifi), "Konum kesin değil" notu gerekiyorsa; altta tek belirgin giriş
düğmesi **"Talebi aç"**, yanında **"Destek öner"** (başkasının açık talebi için) ve
**"Bilgi paylaş"**, mesaj sayaçları ("Yetkililerle iletişim: 2 · Topluluk desteği: 1"),
bildir. Kartın gövdesine tıklamak da sayfayı açar. "Yardım" filtresi yalnızca bu
yapılandırılmış talepleri listeler.

> **[SS-5] Talep kartı** (masaüstü, yukarıdaki öğelerle).

### 4.3 Talep sayfası (tam sayfa)
Talep açılınca sol menü ve sağ sütun kaybolur; okunabilir tek sütun. Üstte "Akışa dön",
başlık **"Yardım talebi"**, durum rozeti (kapalıysa nedeniyle: "Talep kapalı · İhtiyaç
karşılandı"). Özet satırı: ihtiyaçlar, kişi sayısı, herkese açık konum, doğrulama
durumu. **"Talep sahibinin beyanı"** katlanır kartta, kapalıyken iki satır önizleme;
içinde **"Özel bilgiler ve görünürlük"** (adres, telefon, her birinin kilit/dünya
ikonuyla kime açık olduğu). Talep sahibine görünür satır: **"İhtiyacım karşılandı"**
(onay penceresiyle) ve **"Talep bilgilerini düzenle"**.

İki sekme:
- **"Yetkililerle iletişim"**: talep sahibi ile önceden belirlenmiş **gönüllü
  moderatörler** yazışır. Her mesaj gönderilirken bütünüyle **"Yalnızca moderatörler"
  (Özel)** ya da **"Herkese açık"** seçilir; varsayılan özel. Özel bir mesaja yanıt da
  özel kalır (seçici kilitlenir). Dışarıdan bakan biri yalnızca herkese açık
  güncellemeleri görür; özel mesajların varlığını, sayısını, yazarını bile görmez.
- **"Topluluk desteği"**: herkese açık; bilgi, yanıt ve **destek önerisi** ("Destek
  önerisi, yardımın ulaştığı anlamına gelmez." notu). Öneri geri çekilirken onay
  penceresi çıkar, çekilen öneri listeden tamamen kalkar.

Mesajlar forum gibi sola hizalı, yanıtlar tek seviye girintili ve "X kişisine yanıt"
bağlantılı. Yazma alanı: görünürlük seçici, 800 karakterden sonra sayaç, sınır **1000
karakter**, gönderim sonrası kutu temizlenir, taslaklar sekme ve talep başına korunur,
başarısız gönderim aynı işlem kimliğiyle yeniden denenir (mükerrer mesaj oluşmaz).
Yeni mesaj gelince "Yeni mesajlar · Güncelle" düğmesi; talep sahibi topluluk
sekmesindeyken koordinasyon sekmesinde nokta belirir.

**Moderatör işlemleri** ("Talep işlemleri" katlanır bölümü): "Topluluk mesajlarını
durdur/aç", "Talebi herkese kapat/aç" (dışarıdakiler talebi hiç göremez), "Talebi kapat"
(neden zorunlu: İhtiyaç karşılandı / Talep geri çekildi / Mükerrer talep / Diğer),
"Talebi yeniden aç". Hepsi onay penceresiyle; kapatma geçmişi silmez, yeniden açma
diğer ayarları değiştirmez.

> **[SS-6] Talep sayfası, masaüstü, talep sahibi görünümü:** beyan katlı, özel bilgiler
> açık, "İhtiyacım karşılandı" satırı, iki sekme, "Yetkililerle iletişim"de "Özel"
> rozetli mesajlar ve tek seviye girintili yanıt, altta yazma alanı ve "Yalnızca
> moderatörler" seçici.
> **[SS-7] Aynı talep, dışarıdan bakan kişi görünümü:** yalnızca "Herkese açık" tek
> güncelleme, "Buraya talep sahibi ve yetkili moderatörler yazabilir." notu; adres ve
> telefon yok.
> **[SS-8] Telefonda talep sayfası (390 px)**: sekmeler, mesajlar, yazma alanı.
> **[SS-9] "Talep işlemleri" açık, moderatör görünümü** ve **"Talep kapatılsın mı?"**
> onay penceresi.

## 5. Sistem 2 — Bilgi paylaşımları

Akışta yardım talebi olmayan her şey **bilgi**dir. İki tür:

### 5.1 Kurumsal duyurular (Resmî Kurum)
AFAD, Valilik, Kızılay gibi resmî hesapların gönderileri: "deprem oldu", "yollar acil
araçlara ayrıldı". Bunlara **yorum yazılamaz**; kartta "Kurumsal duyuru · Yorumlar
kapalı" yazar. Amaç: resmî bilginin altında tartışma gürültüsü olmasın.

### 5.2 Bilgi gönderileri (yardım çağrısı, enkaz, kayıp, durum, "baraj patladı" vb.)
Kurumsal olmayan her bilgi gönderisi, yardım talebiyle **aynı temel sayfayı** açar ama
amaç farklıdır: **bilginin doğruluğunu yönetmek**. Kartta **"Tartışmayı aç"** ve
sayaçlar ("Doğrulama: N · Tartışma: N"). Sayfa başlığı **"Bilgi paylaşımı"**, üstte
"Paylaşımın metni" kartı.

- **"Moderatörlerle doğrulama"** sekmesi: paylaşan kişi + gönüllü moderatörler.
  Moderatör zamanı olduğunda buraya "Doğrulanmış bilgi yok, lütfen topluluk sekmesinde
  tartışın" gibi bir değerlendirme yazar; sonuç netleşince **"Doğrulama sonucu"**
  kutusundan etiketi kendisi değiştirir: **Doğrulanmış / Doğrulanmamış / Çelişkili**,
  isteğe bağlı gerekçe ("Hangi kaynağa dayanıyor?"), onay penceresi ("Etiket herkese
  görünür."). Etiket kartta ve akışta anında güncellenir.
- **"Topluluk tartışması"** sekmesi: herkes bilginin doğru olup olmadığını tartışır;
  her yoruma **"Katılıyorum · N"**; en çok onaylanan yorum en üstte **"Topluluk notu ·
  En çok onaylanan yorum"** olarak sabitlenir (Community Notes mantığı; kişi başı bir
  oy, kendi yorumunu onaylayamaz). Not: "Tartışma, bilgiyi doğrulanmış yapmaz."
- Eski "Ben de gördüm" düğmesi kaldırıldı; teyit mekaniği bu tartışma alanına taşındı.

**Alıntı mekaniği (retweet gibi):** bir bilgi gönderisi bir yardım talebi hakkında
olabilir. Talep sayfasında ve kartında **"Bu talep hakkında bilgi paylaş"** ile
composer'a talep bağlanır ("Talep hakkında: Deniz · Barınma ve ısınma" çipi). Böyle bir
bilgi kartında talep referansı ve **"Talebin topluluk desteğine git"** düğmesi bulunur;
tek tıkla o talebin topluluk sekmesine gidilir. Talep dışarıya kapatılırsa referans da
kaybolur.

> **[SS-10] Bilgi kartı** ("Doğrulanmamış" rozeti, metin, "Tartışmayı aç", talep
> referans kutusu + "Talebin topluluk desteğine git").
> **[SS-11] Bilgi sayfası "Topluluk tartışması"** (telefon): açıklama şeridi, sabit
> "Topluluk notu · En çok onaylanan yorum" ve "3 kişi katılıyor", altta yorumlar ve
> "Katılıyorum · N" düğmeleri.
> **[SS-12] Bilgi sayfası "Moderatörlerle doğrulama"**, moderatör görünümü: açılmış
> "Doğrulama sonucu" kutusu (Sonuç seçici, Gerekçe, "Sonucu kaydet"), altta
> moderatörün değerlendirme mesajı.
> **[SS-13] Kurumsal duyuru kartı** "Kurumsal duyuru · Yorumlar kapalı" satırıyla.

### 5.3 Yapay zeka doğrulaması (planlanan — TODO, arayüzde yer tutucu var)
- **Kaynaklar:** modele tanınmış devlet kurumları ve afet yardımına odaklı kuruluşlar
  kaynak olarak verilir; model bu kaynakları tarayarak bilginin doğru / yalan / muallak
  olduğuna karar verir.
- **Etiketler:** **Doğrulandı (yeşil) · Yalan (kırmızı) · Muallak (gri)**. Moderatör
  ve resmî etiketle çakışmaması için ayrı bir alan olarak düşünülür; moderatör kararı
  esastır.
- **Öncelik sırası:** (1) paylaşımından bir saat (eşik değişebilir) geçmiş ve hiçbir
  moderatörün ilgilenmediği bilgi gönderileri, eskiden yeniye; (2) böyle gönderi
  kalmadıysa moderatörlerin ilgilenmiş olduğu gönderiler eskiden yeniye (yeniden
  tarama); (3) o da yoksa tüm bilgi gönderileri normal sırada eskiden yeniye.
- **Bugün arayüzde:** bilgi sayfasının moderatör sekmesinin üstünde "Yapay zeka
  doğrulaması · Prototip" bloğu; aynı kurallara göre durum gösterir: "Moderatör
  bekleniyor" / "Yapay zeka sırasında" / "Moderatör değerlendirdi" + üç etiketin
  açıklaması. Arkası henüz yok; sunumda "planlanan mekanizma" diye anlatılır.

> **[SS-14] "Yapay zeka doğrulaması · Prototip" bloğu** ("Moderatör bekleniyor" durumu
> ve yeşil/kırmızı/gri açıklama) bilgi sayfasının moderatör sekmesinde.

## 6. Sistem 3 — Düşük bant genişliği modu (projenin etrafında döndüğü şey)

Afette bağlantı zayıf, telefon şarjı az, kişi stresli. Uygulama **tek dosya** olarak
çalışır (`dist/mihenk.html`), ilk yüklemeden sonra **sıfır ağ isteği** yapar, JavaScript
kapalıyken bile kriz akışı okunabilir (`<noscript>`). Düşük bant modu: görseller,
hareketler, gölgeler kapanır; metin ve tüm işlemler kalır. Düz belge **~11 KB**, tam
sürüm **~450 KB**.

- **Geçiş:** Kriz Var kartının hemen altında, çerçeveli ve turuncu vurgulu tek tıklık
  satır **"Düşük bant genişliği modu · Kapalı/Açık"**; açıklama "Görselleri ve
  hareketleri kapatır; metin ve işlemler kalır. Tam sürüm: ~450 KB · Düz mod: ~11 KB".
- **Çıkış:** mod açıkken ekranın en üstünde sabit siyah çubuk "Düşük bant modu açık" ve
  büyük **"Normal görünüme dön"** düğmesi; her sekmede, kaydırınca da görünür.
- **Görsel dil ("Terminal"):** siyah-beyaz, tek sütun, kutusuz, tek bir amber vurgu
  yalnızca sayfanın birincil eylemine; diğer eylemler altı çizili metin. Ana metin
  kontrastı 21:1. (Dört alternatif değerlendirildi: Terminal, Kâğıt, İçindekiler,
  Çerçeve; Terminal seçildi.)

> **[SS-15] Düşük bant anahtarı satırı** kriz kartının altında (Kapalı durum).
> **[SS-16] Düşük bant modu açık, telefon:** üstte siyah çubuk + "Normal görünüme dön",
> siyah-beyaz akış, amber vurgulu tek birincil düğme, kart ve çipler çerçevesiz.

## 7. Roller ve yetkiler

| İşlem | Talep sahibi | Gönüllü talep moderatörü | Katılımcı | Gözlemci |
| --- | --- | --- | --- | --- |
| Herkese açık talep ve geçmişi okuma | Evet | Evet | Evet | Evet |
| Özel alan ve özel mesajları okuma | Kendi talebi | Yetki kapsamındaki talepler | Hayır | Hayır |
| "Yetkililerle iletişim"e yazma | Evet (talep açıkken) | Evet | Hayır | Hayır |
| "Topluluk desteği"ne yazma | Evet | Evet | Evet | Hayır |
| Beyanı ve gizliliği düzenleme | Evet | Hayır | Hayır | Hayır |
| Topluluğu durdurma, dışarıya kapatma | Hayır | Evet | Hayır | Hayır |
| Talebi kapatma / yeniden açma | Evet | Evet | Hayır | Hayır |
| Bilgi gönderisinde doğrulama sonucu (etiket) | — | Evet | Hayır | Hayır |
| Kurumsal duyuruya yorum | — | Hayır | Hayır | Hayır |

- Moderatörler **önceden belirlenmiş gönüllüler**dir (operatör panelinden atanan
  `request_moderator` yetkisi); AFAD personeli olması gerekmez. Bölge kapsamı
  verilebilir: bölge dışı moderatör talebi göremez ve yönetemez.
- Kurum hesabı olmak, rozet, "gönüllüyüm" demek **özel erişim vermez**. Yasaklı hesap
  sahibi olsa bile yazamaz.
- Sunucu karar verir: istemcinin "yetkim var" demesi bir şey ifade etmez.

## 8. Gizlilik güvenceleri (sunumda vurgulanacak)

- Adres ve telefon ayrı alanlardır; her biri için görünürlük seçilir; varsayılan
  "Yalnızca moderatörler". Herkese açık yer tarifi asla özel adresten türetilmez.
- Dışarıdan bakan biri şunları **hiç almaz**: özel mesaj metni, özel mesaj sayısı,
  özel mesajın yazarı, alıntı önizlemesi, özel adres/telefon; arama özel metinle
  eşleşmez; canlı güncelleme olayları mesaj gövdesi taşımaz.
- Talep dışarıya kapatıldığında akıştan, aramadan ve doğrudan bağlantıdan kaybolur;
  sahibi ve moderatörler görmeye devam eder.
- Kanıt: 86 maddelik otomatik erişim denemesi (sahip, moderatör, bölge dışı moderatör,
  katılımcı, gözlemci; özel alanlar, özel mesajlar, yanıt kuralları, kanal karışması,
  durdurma, kısıtlama, kapatma, tekrar deneme, alıntı, onay oyu, doğrulama sonucu)
  tamamı geçiyor.

## 9. Kalite ve erişilebilirlik

- WCAG 2.2 AA: 27 renk çifti gerçek token değerleriyle ölçülüyor, hepsi geçiyor.
- Klavye: sekmeler ok tuşlarıyla, her öğede görünür odak halkası, modal Escape ile.
- 320 px'e kadar yatay kaydırma yok; 44 px dokunma hedefleri; hareket azaltma tercihi.
- 24 maddelik tarayıcı doğrulaması ve masaüstü/telefon görsel turları hatasız.
- Sohbet mesajı sınırı 1000 karakter (sayaçlı), istek hız sınırı sunucuda.

## 10. Mimari (kısa)

- **Yerel prototip:** tarayıcıda tek başına çalışır; talepler ve mesajlar cihazda
  tutulur. Demo için yeterli, çok kullanıcılı gizliliği kanıtlamaz.
- **Paylaşımlı tatbikat sunucusu:** Node.js + SQLite; operatör paneli (oturum açma
  bağlantıları, roller, bölge kapsamı, duraklatma, tekrar oynatma); her komut için
  makbuz ve sürüm kontrolü; SSE ile kanal bazlı güncelleme (gövde taşımaz).
- **Model katılımcılar (lab):** 20-100 hesaplı tatbikatlar; kural tabanlı ve model
  tabanlı katılımcılar; moderasyon deneyleri (bkz. `docs/agent-experiment-*.md`,
  `docs/adversarial-crisis-benchmark.md` — ek kaynak).

## 11. Canlı demo akışı (5 dakika)

1. Ana akış → kriz tespiti: bildirim, sabit kart, **Kriz Var** sekmesi belirir. `[SS-1]`
2. Kırmızı **"Yardım talebi oluştur"** → sihirbaz: ihtiyaç, herkese açık yer, özel
   adres/telefon "Yalnızca moderatörler", kişi sayısı, beyan, gözden geçirme. `[SS-3, SS-4]`
3. Talep sayfası: beyanı aç, özel bilgileri göster; "Yetkililerle iletişim"e özel mesaj
   yaz; yanıtla (yanıt özel kalır); herkese açık güncelleme yaz. `[SS-6]`
4. Aynı talebi dışarıdan bakan hesapta aç: yalnızca herkese açık güncelleme görünür,
   adres/telefon yok. `[SS-7]`
5. "Topluluk desteği": destek önerisi yaz, geri çek (onay penceresi). Talep sahibi
   "İhtiyacım karşılandı" → onay → "Talep kapalı · İhtiyaç karşılandı".
6. Bilgi gönderisi ("baraj patladı"): **"Tartışmayı aç"**; toplulukta yorum ve
   "Katılıyorum"; sabitlenen **Topluluk notu**; moderatör "Doğrulama sonucu" ile
   **Çelişkili** etiketler; kartın rozeti değişir. `[SS-10, SS-11, SS-12]`
7. Talep hakkında bilgi paylaş → kartta "Talebin topluluk desteğine git". `[SS-10]`
8. **Düşük bant modu** anahtarı → siyah-beyaz Terminal görünümü → "Normal görünüme dön". `[SS-15, SS-16]`

## 12. Muhtemel sorular ve kısa cevaplar

- **Moderatörler kim?** Önceden belirlenmiş gönüllüler; operatör atar, bölgeyle
  sınırlanabilir. Otomatik AFAD personeli değil.
- **Özel bilgiler nasıl korunuyor?** Sunucu her görünümü kişiye göre üretir; yetkisi
  olmayana özel alan/mesaj hiç gönderilmez (86 otomatik kontrol).
- **Yardım ulaştı mı?** Sistem "destek önerisi"ni "yardım ulaştı" saymaz; kapanış nedeni
  ayrıca kaydedilir; doğrulama, koordinasyon ve yardımın ulaşması ayrı kavramlardır.
- **Yapay zeka?** Planlanan: kurum kaynaklarını tarayan model, üç öncelik sırası, üç
  etiket; bugün arayüzde yer tutucu.
- **Düşük bantta ne kaybolur?** Görseller ve hareket; hiçbir işlem kaybolmaz; ~11 KB.
- **Ölçek?** Prototip; tatbikat sunucusunda 20-100 model katılımcıyla senaryolar
  koşuldu (ek kaynaklarda).

## 13. Yol haritası (sunumda "sırada" diye)

- Yapay zeka doğrulama kuyruğu ve kaynak gösterimi (§5.3).
- Onay oylarında hesap güvenilirliğine göre ağırlık ("en çok doğrulanan insanlar").
- Talep başına moderatör atama/üstlenme akışı.
- Kart ve şeritlerde "künye" görsel dili (sol renk şeridi yerine üst kenarı kıran
  etiket) — uygulanıyor.

## 14. Ek kaynaklar (ihtiyaç halinde)

- `README.md` — problem, literatür, komutlar, yapı.
- `docs/HELP_REQUEST_IMPLEMENTATION_PLAN.md` — talep sayfası tasarım planı, kararlar
  (§4), gizlilik projeksiyonu (§11), uygulama kayıtları (§19-27).
- `docs/reviews/2026-09-18-code-review.md`, `docs/reviews/2026-09-18-ux-copy-review.md` —
  inceleme bulguları ve yapılan düzeltmeler.
- `docs/hardening-design.md`, `docs/hardening-plan.md`, `docs/participant-access.md` —
  paylaşımlı sunucu ve erişim modeli.
- `docs/agent-experiment-report.md`, `docs/adversarial-crisis-benchmark.md`,
  `docs/experiments/` — model katılımcı tatbikatları ve moderasyon deneyleri.
- `clips/` — deterministik demo GIF'leri (kriz etkinleşmesi, doğrulama durumları, imdat
  akışı, sekme geçişi).
