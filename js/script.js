// Global değişkenler
let odulListe = [];
let bankaTeklifi = 0;

// Yardımcı Fonksiyonlar
function kKutuInaktif() {
  $(".kucuk-kutu").css("z-index", "-1");
  $(".kucuk-kutu").css("background-color", "rgb(160, 160, 160)");
}

function kKutuAktif() {
  setTimeout("$('.kucuk-kutu').css('z-index', '2');", 750);
  setTimeout(
    "$('.kucuk-kutu').css('background-color', 'rgb(190, 190, 190)');",
    750
  );
}

function tekTitreme(a) {
  $(".telefon").animate(
    { deg: -a },
    {
      duration: 20,
      step: function (now) {
        $(this).css({ transform: "rotate(" + now + "deg)" });
      },
    }
  );
}

function telTitret() {
  for (let i = 1000; i <= 2000; i += 80) {
    tekTitreme(-2);
    tekTitreme(2);
  }
  tekTitreme(0);
}

function varimTiklandi() {
  $(".teklif-alani").text(bankaTeklifi + "$  KAZANDINIZ!");
  $(".var-yok").hide();
  $(".yeni-oyun").show();
  $(".yeni-oyun").click(function () {
    location.reload();
  });
}

// Oyun Başlatma ve Ana Mantık
$(document).ready(function () {
  // odulListe'yi başlangıçta doldur
  odulListe = Array.from(document.querySelectorAll(".para"));

  $(".play-butonu").click(function () {
    $(".oyunu-baslat").hide();
    $(".kucuk-kutu").show();
    $(".kutu-sec").show();

    // Kutu Seçme İşlemleri
    $("div[data-num]").click(function () {
      let kutuNo = $(this).attr("data-num");
      let dataNumDom = $("div[data-num]");

      // İlk kutu seçimi
      if (dataNumDom.length == 20) {
        $(".buyuk-kutu-no").text(kutuNo);
        let dataNumValue = $(this).attr("data-num");
        $(this).removeAttr("data-num");
        $(this).attr("data-senin-kutun", dataNumValue);
        $(this).text("SENİN KUTUN");
        $(this).addClass("senin-kutun");
        kKutuInaktif();
        $(".kutu-sec")
          .css({
            padding: "10px",
            fontSize: "99%",
            height: "10vh",
          })
          .text("Banka teklifine kadar kutu açmaya devam et!");
        $(".kutu-govde").show();
        $(".kutu-govde").animate(
          { width: "40%", height: "25%", left: "30%" },
          400
        );
        kKutuAktif();
        return;
      }

      // Diğer kutuları açma
      if ($(this).attr("data-num")) {
        $(this).css("opacity", "0.7");
        kKutuInaktif();
        if (dataNumDom.length == 19) {
          $(".kutu-sec").hide();
        }
        oduluGoster(kutuNo);
        kKutuAktif();
      }
      $(this).removeAttr("data-num");

      // Banka teklifi kontrolü
      if (
        dataNumDom.length == 15 ||
        dataNumDom.length == 11 ||
        dataNumDom.length == 7 ||
        dataNumDom.length == 4
      ) {
        bankaTeklifiniGoster();
      }

      // Son kutu kontrolü
      if (dataNumDom.length == 2) {
        $(".yokum").text("KUTUNU AÇ");
        bankaTeklifiniGoster();
        sonKutuIslemleri();
      }
    });
  });
});

// Ödül gösterme fonksiyonu
function oduluGoster(kutuNo) {
  // Kutu animasyonları
  $(".kutu-govde").hide();
  $(".kutu-kapak").hide();
  $(".kutu-govde").animate({ width: "10%", height: "0", left: "45%" }, 10);
  $(".kutu-kapak").animate({ top: "50%", height: "0" }, 10);
  $(".kutu-govde").show();
  setTimeout(() => $(".kutu-kapak").show(), 400);

  // Rastgele ödül seçimi ve gösterimi
  let rastOdulKonum = Math.floor(Math.random() * odulListe.length);
  let rastOdul = odulListe[rastOdulKonum];
  let odulDegeri = rastOdul.attributes["odul"].value;

  // Ödül renk kontrolü ve gösterimi
  let odulAlani = document.querySelector(".odul-alani");
  if (odulDegeri <= 750) {
    odulAlani.classList.remove("kirmizi-yazi");
    $(".odul-alani").text(odulDegeri + "$");
  } else {
    odulAlani.classList.add("kirmizi-yazi");
    $(".odul-alani").text(odulDegeri + "$");
  }

  // Para animasyonu
  $(rastOdul).animate({ left: "60px", width: "0" }, 800);
  rastOdul.classList.add("acildi");
  odulListe.splice(rastOdulKonum, 1);

  // Kutu numarası gösterimi
  $(".buyuk-kutu-no").text(kutuNo);
  $(".kutu-govde").animate({ width: "40%", height: "25%", left: "30%" }, 400);
  setTimeout(
    () => $(".kutu-kapak").animate({ top: "27%", height: "23%" }, 400),
    400
  );
}

// Banka teklifi gösterme fonksiyonu
function bankaTeklifiniGoster() {
  // Overlay ve animasyon hazırlıkları
  setTimeout(() => {
    $(".kutu-kapak").css("visibility", "hidden");
    $(".kutu-govde").css("visibility", "hidden");
    $(".container-kucuk-kutu").hide();
  }, 900);

  setTimeout(() => {
    $(".overlay-teklif").animate({ height: "100%" }, 1000);
    $(".telefon").show();
  }, 100);

  // Teklif hesaplama
  let toplamParaDeger = 0;
  odulListe.forEach((odul) => {
    let odulDegeri = parseInt(odul.attributes["odul"].value);
    toplamParaDeger += odulDegeri;
  });

  bankaTeklifi = Math.round((toplamParaDeger / odulListe.length) * 0.75);
  $(".teklif-alani").text("BANKANIN TEKLİFİ " + bankaTeklifi + "$");

  // Telefon animasyonu ve teklif gösterimi
  setTimeout(() => telTitret(), 1500);
  setTimeout(() => {
    $(".teklif-goster").show();
    $(".siyah-ekran").css("background-color", "#29a063");
    $(".telefon").css("animation", "none");
  }, 3500);

  // Teklif kabul/red işlemleri
  $(".varim").click(function () {
    varimTiklandi();
  });

  $(".yokum").click(function () {
    setTimeout(() => $(".overlay-teklif").animate({ height: "0" }, 1000), 10);
    setTimeout(() => {
      $(".kutu-kapak").css("visibility", "visible");
      $(".kutu-govde").css("visibility", "visible");
      $(".container-kucuk-kutu").show();
      $(".teklif-goster").hide();
      $(".telefon").hide();
      $(".siyah-ekran").css("background-color", "black");
    }, 500);
  });
}

// Son kutu işlemleri
function sonKutuIslemleri() {
  $(".yokum")
    .off("click")
    .on("click", function () {
      setTimeout(() => {
        $(".overlay-teklif").animate({ height: "0" }, 1000);
        $(".kutu-kapak").css("visibility", "visible");
        $(".kutu-govde").css("visibility", "visible");
        $(".container-kucuk-kutu").show();
        $(".teklif-goster").hide();
        $(".telefon").hide();
      }, 500);

      setTimeout(() => sonKutuyuAc(), 1500);

      setTimeout(() => {
        overlayPage();
        setTimeout(() => {
          $(".teklif-goster").show();
          $(".teklif-alani").text(
            odulListe[0].attributes["odul"].value + "$  KAZANDINIZ!"
          );
          $(".var-yok").hide();
          $(".yeni-oyun").show();

          // Yeni oyun butonu için click event'i ekleyelim
          $(".yeni-oyun")
            .off("click")
            .on("click", function () {
              location.reload();
            });
        }, 3500);
      }, 4500);
    });
}

// Son kutuyu açma işlemi
function sonKutuyuAc() {
  // Kutu animasyonları
  $(".kutu-govde").hide();
  $(".kutu-kapak").hide();
  $(".kutu-govde").animate({ width: "10%", height: "0", left: "45%" }, 10);
  $(".kutu-kapak").animate({ top: "50%", height: "0" }, 10);

  // Senin kutunu bul ve göster
  let seninKutun = $("[data-senin-kutun]").attr("data-senin-kutun");
  $(".buyuk-kutu-no").text(seninKutun);

  // Son kalan ödülü göster
  let sonOdul = odulListe[0];
  let odulDegeri = sonOdul.attributes["odul"].value;

  // Ödül renk kontrolü ve gösterimi
  let odulAlani = document.querySelector(".odul-alani");
  if (odulDegeri <= 750) {
    odulAlani.classList.remove("kirmizi-yazi");
  } else {
    odulAlani.classList.add("kirmizi-yazi");
  }
  $(".odul-alani").text(odulDegeri + "$");

  // Para animasyonu
  $(sonOdul).animate({ left: "60px", width: "0" }, 800);
  sonOdul.classList.add("acildi");

  // Kutu animasyonları
  $(".kutu-govde").show();
  $(".kutu-govde").animate({ width: "40%", height: "25%", left: "30%" }, 400);
  setTimeout(() => {
    $(".kutu-kapak").show();
    $(".kutu-kapak").animate({ top: "27%", height: "23%" }, 400);
  }, 400);
}

// overlayPage fonksiyonu eklenmeli
function overlayPage() {
  setTimeout(() => {
    $(".kutu-kapak").css("visibility", "hidden");
    $(".kutu-govde").css("visibility", "hidden");
    $(".container-kucuk-kutu").hide();
  }, 900);

  setTimeout(() => {
    $(".overlay-teklif").animate({ height: "100%" }, 1000);
    $(".telefon").show();
  }, 100);
}
