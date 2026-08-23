/* ==========================================================================
   MİHENK — seed data
   All accounts are fictional template accounts. No real people, no real
   phone numbers, no real addresses. Place names are public district names.
   ========================================================================== */
(function (root) {
  'use strict';

  /* --- deterministic hash so avatars never change between runs ---------- */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function initials(name) {
    var parts = name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/);
    var a = parts[0] ? parts[0][0] : '?';
    var b = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (a + b).toLocaleUpperCase('tr-TR');
  }

  /* Generated SVG avatar: deterministic duotone disc + initials.
     No image files, no network. */
  function avatar(name, opts) {
    opts = opts || {};
    var h = hash(name);
    var hue = h % 360;
    var hue2 = (hue + 38 + (h >> 9) % 40) % 360;
    var sat = 58 + (h >> 3) % 18;
    var l1 = 42 + (h >> 5) % 10;
    var l2 = 24 + (h >> 7) % 10;
    var id = 'g' + h.toString(36);
    var txt = opts.glyph || initials(name);
    var fs = txt.length > 2 ? 15 : 17;
    return '<svg viewBox="0 0 40 40" role="img" aria-label="' + esc(name) + '" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="hsl(' + hue + ' ' + sat + '% ' + l1 + '%)"/>' +
      '<stop offset="1" stop-color="hsl(' + hue2 + ' ' + sat + '% ' + l2 + '%)"/>' +
      '</linearGradient></defs>' +
      '<rect width="40" height="40" fill="url(#' + id + ')"/>' +
      '<circle cx="' + (8 + h % 24) + '" cy="' + (30 - (h >> 4) % 22) + '" r="' + (9 + (h >> 6) % 8) +
        '" fill="hsl(' + hue2 + ' ' + sat + '% ' + (l1 + 14) + '% / .35)"/>' +
      '<text x="20" y="20" text-anchor="middle" dominant-baseline="central" ' +
        'font-family="system-ui, sans-serif" font-size="' + fs + '" font-weight="700" ' +
        'fill="rgba(255,255,255,.94)" letter-spacing=".5">' + esc(txt) + '</text>' +
      '</svg>';
  }

  /* Generated media placeholder — abstract, obviously synthetic. */
  function media(seed) {
    var h = hash('m' + seed);
    var hue = h % 360;
    var id = 'm' + h.toString(36);
    var bars = '';
    for (var i = 0; i < 9; i++) {
      var x = i * 71 + (h >> i) % 20;
      var w = 26 + (h >> (i + 2)) % 34;
      var y = 40 + (h >> (i + 3)) % 180;
      bars += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (360 - y) +
              '" rx="6" fill="hsl(' + ((hue + i * 9) % 360) + ' 30% ' + (18 + i * 2) + '% / .5)"/>';
    }
    return '<svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Görsel" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="hsl(' + hue + ' 40% 20%)"/>' +
      '<stop offset="1" stop-color="hsl(' + ((hue + 46) % 360) + ' 44% 11%)"/></linearGradient></defs>' +
      '<rect width="640" height="360" fill="url(#' + id + ')"/>' + bars +
      '<circle cx="' + (120 + h % 400) + '" cy="' + (70 + (h >> 8) % 120) + '" r="46" fill="hsl(' + ((hue + 180) % 360) + ' 55% 60% / .16)"/>' +
      '</svg>';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---- people ---------------------------------------------------------- */
  var users = [
    { id: 'u1',  name: 'Elif Yıldırım',  handle: 'elifyildirim',  bio: 'Peyzaj mimarı · İzmir' },
    { id: 'u2',  name: 'Mert Arslan',    handle: 'mertarslan',    bio: 'Yazılımcı, kahve tiryakisi' },
    { id: 'u3',  name: 'Zeynep Kaya',    handle: 'zeynepkaya',    bio: 'Öğretmen · kitap kurdu' },
    { id: 'u4',  name: 'Burak Demir',    handle: 'burakdemir',    bio: 'Fotoğraf, bisiklet, uzun yürüyüş' },
    { id: 'u5',  name: 'Selin Aydın',    handle: 'selinaydin',    bio: 'Veri analisti' },
    { id: 'u6',  name: 'Emre Şahin',     handle: 'emresahin',     bio: 'Müzisyen · Ankara' },
    { id: 'u7',  name: 'Ayşe Korkmaz',   handle: 'aysekorkmaz',   bio: 'Hemşire' },
    { id: 'u8',  name: 'Can Polat',      handle: 'canpolat',      bio: 'Mimar · maket delisi' },
    { id: 'u9',  name: 'Deniz Ergün',    handle: 'denizergun',    bio: 'Editör' },
    { id: 'u10', name: 'Hakan Yalçın',   handle: 'hakanyalcin',   bio: 'Tarih öğretmeni' },
    { id: 'u11', name: 'Merve Doğan',    handle: 'mervedogan',    bio: 'Grafik tasarım' },
    { id: 'u12', name: 'Onur Çetin',     handle: 'onurcetin',     bio: 'Elektrik mühendisi' }
  ];

  var orgs = [
    { id: 'o1', name: 'AFAD',        handle: 'AFAD',         org: true, glyph: 'AF', bio: 'Afet ve Acil Durum Yönetimi (temsilî hesap)' },
    { id: 'o2', name: 'Valilik',     handle: 'Valilik',      org: true, glyph: 'V',  bio: 'İl kriz koordinasyonu (temsilî hesap)' },
    { id: 'o3', name: 'Kızılay',     handle: 'Kizilay',      org: true, glyph: 'KZ', bio: 'Kan, barınma, beslenme (temsilî hesap)' },
    { id: 'o4', name: 'Meteoroloji', handle: 'Meteoroloji',  org: true, glyph: 'MG', bio: 'Hava ve uyarı bültenleri (temsilî hesap)' }
  ];

  var me = { id: 'me', name: 'Deadlock Greed', handle: 'DeadlockGreed', bio: 'burada' };

  var byId = {};
  users.concat(orgs).concat([me]).forEach(function (u) {
    u.avatar = avatar(u.name, { glyph: u.glyph });
    byId[u.id] = u;
  });

  /* ---- normal feed ----------------------------------------------------- */
  function P(id, uid, t, text, likes, reposts, replies, extra) {
    var p = { id: id, uid: uid, t: t, text: text,
      likes: likes, reposts: reposts, replies: replies, views: (likes * 37 + 411) };
    if (extra) for (var k in extra) p[k] = extra[k];
    return p;
  }

  var forYou = [
    P('n1','u2','12 dk','Üç saattir peşinde olduğum hata, tek bir eksik noktalı virgülmüş. Meslek hayatımın özeti.',412,38,26),
    P('n2','u11','18 dk','Yeni poster serisinin ilk üçü çıktı. Renk paleti tamamen eski tramvay biletlerinden.',1284,196,54,{ media: 'poster' }),
    P('n3','u6','24 dk','Stüdyoda bugün: bir davul, iki mikrofon, sıfır plan. En iyi kayıtlar böyle çıkıyor.',703,74,31),
    P('n4','u5','31 dk','Excel’de yapılabilecek her şeyi Excel’de yapmak zorunda değiliz. Bunu bir tabelaya yazdırıp asacağım.',2210,411,183),
    P('n5','u4','38 dk','Sabah 6’da yola çıktım, 7’de bu manzaradaydım. Erken kalkmanın tek savunulabilir sebebi.',3390,528,96,{ media: 'daglar' }),
    P('n6','u3','47 dk','Öğrenci defterine “kitap bitince üzülüyorum” yazmış. Onu anlıyorum.',5721,904,212),
    P('n7','u9','52 dk','Bir cümleyi kısaltmak, uzatmaktan her zaman daha çok zaman alıyor.',889,131,27),
    P('n8','u8','1 sa','Maket bıçağını üçüncü kez kaybettim. Muhtemelen maketin içinde.',432,21,44),
    P('n9','u1','1 sa','Şehirdeki her boş arsa aslında bir soru: gölge mi istiyoruz, otopark mı?',1673,388,141),
    P('n10','u12','1 sa','Elektrik kesintisinde en çok özlediğim şey ışık değil, buzdolabının sesi.',2044,297,88),
    P('n11','u7','2 sa','Gece vardiyası bitti. Sabah kahvesi bugün fazlasıyla hak edilmiş durumda.',760,42,19),
    P('n12','u10','2 sa','Öğrenciler “tarih ezberdir” diyor, ben “tarih tartışmadır” diyorum. Zil çalıyor, tartışma yarıya kalıyor.',1512,246,73),
    P('n13','u2','2 sa','Kod incelemesinde en sevdiğim yorum: “bu neden çalışıyor?” Cevabı olmayan tek soru.',998,164,52),
    P('n14','u11','3 sa','Tipografi tavsiyesi: ilk taslakta hiç renk kullanma. Renk, hizalamayı gizler.',1341,289,36),
    P('n15','u4','3 sa','Fotoğraf makinemi tamire verdim. İki haftadır telefonla çekiyorum ve kimse fark etmedi.',622,58,41,{ media: 'kamera' }),
    P('n16','u5','3 sa','Veri temizliği: işin %80’i. Sunum: işin %5’i. Alkış: sunuma.',3102,712,124),
    P('n17','u6','4 sa','Bir şarkının en zor kısmı ilk sekiz saniye. Gerisi kendi kendine geliyor.',845,96,22),
    P('n18','u3','4 sa','Sınıfta sessizlik olduğunda ya çok iyi bir şey oluyordur ya da çok kötü. Ortası yok.',2673,433,97),
    P('n19','u9','5 sa','Yazarın “bunu kısaltamam” dediği paragraf, genelde kısaltılması gereken paragraftır.',1108,201,44),
    P('n20','u8','5 sa','Merdiven detayı çizmek, bütün binayı çizmekten uzun sürüyor. Kimse inanmıyor.',517,63,29),
    P('n21','u1','6 sa','Balkonda üç saksı, iki hayatta. İstatistik olarak fena değil.',1937,171,63),
    P('n22','u12','7 sa','Multimetre olmadan geçen bir gün, tahminlerle geçen bir gündür.',402,37,12),
    P('n23','u7','8 sa','Hastanenin koridorunda sabah ışığı çok garip düşüyor. Her seferinde duruyorum.',1265,148,31,{ media: 'koridor' }),
    P('n24','u10','9 sa','Ders kitabında bir harita hatası buldum. Öğrenciler benden önce bulmuştu.',2891,566,118),
    P('n25','u2','10 sa','Yerel ortamda çalışıyor.',7420,1980,342),
    P('n26','u11','12 sa','Beyaz alan bir boşluk değil, bir karar.',1622,347,29),
    P('n27','u5','14 sa','Ortalama, tek başına neredeyse hiçbir şey anlatmıyor. Yine de en çok o paylaşılıyor.',2530,604,77),
    P('n28','u6','16 sa','Metronomla çalışmayı sevmiyorum ama metronom haklı.',693,71,18),
    P('n29','u4','18 sa','Aynı sokağı üç yıldır çekiyorum. Sokak değişmiyor, ben değişiyorum.',4180,893,152,{ media: 'sokak' }),
    P('n30','u3','20 sa','Kütüphaneye yeni gelen kitapların kokusu diye bir şey var ve bilimsel olarak kanıtlanmalı.',1487,192,58)
  ];

  var following = [
    P('f1','u1','4 dk','Bugün öğrendiğim şey: bir ağacın gölgesi, o ağacın yaşından daha çok şey anlatıyor.',214,18,7),
    P('f2','u8','16 dk','1/50 ölçekte çizilen bir kapı, 1/100’de kapı olmaktan çıkıyor. Ölçek bir üsluptur.',176,24,5),
    P('f3','u9','29 dk','Bir metni yüksek sesle okumak, üç kez sessiz okumaya bedel.',341,52,11),
    P('f4','u12','44 dk','Kabloların rengini standartlaştıran insana bir heykel dikilmeli.',298,41,16),
    P('f5','u7','1 sa','Nöbet listesi asıldı. Önümüzdeki iki hafta sakin görünüyor. Böyle yazmakla bozdum.',402,29,22),
    P('f6','u10','2 sa','Bir olayın tarihini bilmek kolay, sırasını bilmek zor.',519,88,14),
    P('f7','u2','3 sa','Test yazmayı sevmiyorum ama testlerin beni sevdiğini biliyorum.',233,31,9),
    P('f8','u11','4 sa','Renk körlüğü simülasyonu olmayan tasarım aracı, yarım araçtır.',611,164,23),
    P('f9','u5','6 sa','Grafiğin ekseni sıfırdan başlamıyorsa, grafiğin kendisi bir iddiadır.',1204,377,41),
    P('f10','u6','8 sa','Amfide akort tutmuyor, salonun nemi %70. Fizik kazandı.',187,12,6),
    P('f11','u4','11 sa','En iyi objektif, yanında taşıdığın objektiftir.',455,73,18),
    P('f12','u3','15 sa','Bir öğrenci “öğretmenim bu konuyu sevdim” dedi. Günün geri kalanı önemsiz.',978,145,37)
  ];

  /* ---- crisis feed ----------------------------------------------------- */
  var TAGS = [
    { id: 'yardim', label: 'Yardım Çağrısı' },
    { id: 'enkaz',  label: 'Enkaz Bildirimi' },
    { id: 'kayip',  label: 'Kayıp İlanı' },
    { id: 'nokta',  label: 'Yardım Noktası' },
    { id: 'resmi',  label: 'Resmî Duyuru' },
    { id: 'durum',  label: 'Durum Bilgisi' }
  ];

  var VER = {
    verified:   { label: 'Doğrulanmış',   icon: 'check-circle' },
    official:   { label: 'Resmî Kurum',   icon: 'shield' },
    unverified: { label: 'Doğrulanmamış', icon: 'question-circle' },
    disputed:   { label: 'Çelişkili',     icon: 'exclamation' }
  };

  function C(id, uid, t, text, v, tag, loc, extra) {
    var p = { id: id, uid: uid, t: t, text: text, v: v, tag: tag, loc: loc };
    if (extra) for (var k in extra) p[k] = extra[k];
    return p;
  }

  /* 24 posts: every tag × every verification state. */
  var crisis = [
    /* yardım çağrısı */
    C('c1','o1','2 dk','Pazarcık merkezde iki mahallede arama kurtarma ekipleri konuşlandı. Yardım talebi olan vatandaşlar konumlarını bu sekmeden bildirebilir.','official','yardim','Pazarcık'),
    C('c2','u7','4 dk','Sağlık personeliyim, Onikişubat’ta gönüllü olarak toplanma alanındayım. Tıbbi malzeme ihtiyacı olan gruplar buradan yazabilir.','verified','yardim','Onikişubat'),
    C('c3','u5','6 dk','Bir apartmanda ısıtıcı ve battaniye ihtiyacı olduğu söyleniyor, kendim görmedim. Doğrulayabilecek biri var mı?','unverified','yardim','Dulkadiroğlu'),
    C('c4','u10','9 dk','Aynı yardım çağrısı üç farklı konumla dolaşıyor. En az ikisi hatalı. Paylaşmadan önce konumu teyit edin.','disputed','yardim','Türkoğlu'),

    /* enkaz bildirimi */
    C('c5','o2','7 dk','Elbistan’da hasar tespit ekipleri sahaya çıktı. Enkaz bildirimleri koordinasyon merkezine tek kanaldan iletiliyor.','official','enkaz','Elbistan'),
    C('c6','u12','11 dk','Sanayi sitesinde bir yapının giriş katı çökmüş durumda. Ekipler bölgede, çevre güvenliği alındı.','verified','enkaz','Elbistan'),
    C('c7','u2','13 dk','İkinci bir yapıda hasar olduğu yönünde mesajlar geliyor, teyit edilmedi. Ekip yönlendirilmeden önce doğrulanmalı.','unverified','enkaz','Göksun'),
    C('c8','u9','17 dk','Bu görüntünün bugüne ait olmadığı yönünde iki ayrı bildirim var. İçerik incelemede.','disputed','enkaz','Afşin'),

    /* kayıp ilanı */
    C('c9','o2','14 dk','Kayıp başvuruları için il koordinasyon merkezinde tek liste tutuluyor. Mükerrer kayıt açmayın, aynı kayda ekleme yapın.','official','kayip','Kahramanmaraş'),
    C('c10','u3','19 dk','Ailesiyle irtibatı kesilen bir grup öğrenci toplanma alanında güvende. İsim listesi koordinasyon masasına iletildi.','verified','kayip','Onikişubat'),
    C('c11','u11','22 dk','Bir yakınının aranması için paylaşım yapılmış, ilan sahibine ulaşılamıyor. Teyit bekliyor.','unverified','kayip','Nurhak'),
    C('c12','u6','26 dk','Aynı kayıp ilanı iki farklı isimle paylaşılıyor. Hangisinin doğru olduğu belirsiz, yaymayın.','disputed','kayip','Ekinözü'),

    /* yardım noktası */
    C('c13','o3','8 dk','Kızılay barınma ve beslenme noktaları kuruldu. Kan bağışı yalnızca resmî merkezlerde alınıyor, sahada toplama yapılmıyor.','official','nokta','Kahramanmaraş'),
    C('c14','u1','21 dk','Toplanma alanındaki dağıtım noktası aktif; sıcak içecek ve battaniye var. Kendim oradayım.','verified','nokta','Dulkadiroğlu'),
    C('c15','u8','24 dk','Bir spor salonunun yardım noktası olarak açıldığı söyleniyor. Resmî listede henüz görünmüyor.','unverified','nokta','Andırın'),
    C('c16','u4','29 dk','Kapandığı duyurulan bir dağıtım noktası hâlâ açık olarak paylaşılıyor. Gitmeden önce teyit edin.','disputed','nokta','Çağlayancerit'),

    /* resmî duyuru */
    C('c17','o1','1 sa','Bölgede arama kurtarma çalışmaları kesintisiz sürüyor. Yollar acil durum araçlarına ayrıldı, zorunlu olmadıkça araçla giriş yapmayın.','official','resmi','Kahramanmaraş'),
    C('c18','u11','1 sa','“Resmî duyuru” diye dolaşan iki metin birbiriyle çelişiyor: biri toplanma alanının taşındığını, diğeri aynı yerde kaldığını söylüyor. İkisini de paylaşmayın.','disputed','resmi','Dulkadiroğlu'),
    C('c19','u10','1 sa','Kurum duyurusunun ekran görüntüsünü paylaşıyorum, kaynağı doğruladım; resmî hesapta da yayımlandı.','verified','resmi','Göksun'),
    C('c20','u2','2 sa','“Tüm okullar iki hafta tatil” diye dolaşan mesajın kaynağı yok. Resmî bir açıklama görmedim.','unverified','resmi','Kahramanmaraş'),

    /* durum bilgisi */
    C('c21','o4','3 sa','Artçı sarsıntılar sürüyor, gece sıcaklığının mevsim normallerinin altına inmesi bekleniyor. Hasarlı yapılara eşya almak için dahi girilmemeli.','official','durum','Kahramanmaraş'),
    C('c22','u12','3 sa','İki mahallede elektrik geri geldi, şebeke suyu hâlâ yok. Kendi ölçümüm, saat başı güncelliyorum.','verified','durum','Elbistan'),
    C('c23','u7','4 sa','Bir hastanenin acil servisinin kapasitesinin dolduğu söyleniyor, resmî teyit bekliyorum.','unverified','durum','Onikişubat'),
    C('c24','u9','5 sa','Yol durumu hakkında birbiriyle çelişen iki bildirim var: biri kapalı diyor, biri tek şerit açık diyor.','disputed','durum','Pazarcık')
  ];

  root.SEED = {
    users: users, orgs: orgs, me: me, byId: byId,
    forYou: forYou, following: following, crisis: crisis,
    TAGS: TAGS, VER: VER,
    avatar: avatar, media: media, hash: hash, esc: esc
  };
})(window.MIHENK = window.MIHENK || {});
