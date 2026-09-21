/* ============================================================
   WEDDING INVITATION — CONFIG
   ------------------------------------------------------------
   This is the ONLY file you need to edit to update names,
   dates, venues, addresses or colours. Everything else reads
   from here. Keep the structure the same — just change the
   text inside the quotes.
   ============================================================ */

const WEDDING_CONFIG = {

  couple: {
    groom: "Dhiraj",
    bride: "Tanu",
    groomHi: "धीरज",
    brideHi: "तनु"
  },

  parents: {
    en: {
      groomLine: "S/o Shri Markandey & Chandrashila Devi",
      brideLine: "D/o Shri Sudhir & Santosh Devi"
    },
    hi: {
      groomLine: "पुत्र श्री मारकंडेय एवं चंद्रशीला देवी",
      brideLine: "पुत्री श्री सुधीर एवं संतोष देवी"
    }
  },

  // Google Maps destination for the wedding venue — the supplied share link,
  // used directly (not rebuilt from a text query).
  venueMapUrl: "https://share.google/B2vwpaK1TmQzatIac",

  homeAddress: {
    en: "Parashi Chaklal, Post – Ropan Chhapra,\nDistrict – Deoria, Uttar Pradesh",
    hi: "परासी चकलाल, पोस्ट – रोपन छपरा,\nजिला – देवरिया, उत्तर प्रदेश"
  },

  events: {
    manas: {
      title: { en: "Manas Path", hi: "मानस पाठ" },
      date: { en: "29 – 30 November 2026", hi: "29 – 30 नवंबर 2026" },
      day: { en: "", hi: "" },
      time: { en: "", hi: "" },
      venue: { en: "At Home", hi: "निवास स्थान पर" },
      address: null // filled from homeAddress at render time
    },
    mehndi: {
      title: { en: "Mehndi & Sangeet", hi: "मेहंदी एवं संगीत" },
      date: { en: "1 December 2026", hi: "1 दिसंबर 2026" },
      day: { en: "Tuesday", hi: "मंगलवार" },
      time: { en: "5:30 PM", hi: "शाम 5:30 बजे" },
      venue: { en: "At Home", hi: "निवास स्थान पर" },
      address: null
    },
    haldi: {
      title: { en: "Haldi", hi: "हल्दी" },
      date: { en: "2 December 2026", hi: "2 दिसंबर 2026" },
      day: { en: "Wednesday", hi: "बुधवार" },
      time: { en: "10:30 AM", hi: "सुबह 10:30 बजे" },
      venue: { en: "At Home", hi: "निवास स्थान पर" },
      address: null
    },
    wedding: {
      title: { en: "Shubh Vivah", hi: "शुभ विवाह" },
      date: { en: "2 December 2026", hi: "2 दिसंबर 2026" },
      day: { en: "Wednesday", hi: "बुधवार" },
      time: { en: "5:00 PM", hi: "शाम 5:00 बजे" },
      venue: { en: "Tejashvi Palace", hi: "तेजस्वी पैलेस" },
      address: {
        en: "Lar Bazar Thana Road, Deoria Salempur Rd, 274502",
        hi: "लार बाजार थाना रोड, देवरिया सलेमपुर रोड, 274502"
      }
    }
  },

  littleStars: {
    names: ["Tappu", "Tuktuk", "Pihu", "Tasu", "Tasi", "Aadvit"],
    namesHi: ["टप्पू", "टुकटुक", "पिहू", "टासू", "टासी", "आद्वित"]
  },

  // ICS calendar file content is generated from this (see script.js).
  calendarEvent: {
    title: "Dhiraj & Tanu — Shubh Vivah",
    location: "Tejashvi Palace, Lar Bazar Thana Road, Deoria Salempur Rd, 274502",
    // Wall-clock start of the wedding, IST. Used only for the calendar file
    // (there is no on-screen countdown).
    startISTOffset: "2026-12-02T17:00:00+05:30",
    durationHours: 4
  },

  // Shown as a small, static line on the final screen — not a form or
  // RSVP system, just contact numbers for guests with questions.
  contacts: [
    { name: "Markandey Mishra", phone: "8874735965" },
    { name: "Dhiraj Mishra", phone: "9773654342" }
  ],

  copy: {
    en: {
      ganesha: "Shri Ganeshay Namah",
      openingBlessing: "With the blessings of our families",
      tapToOpen: "Tap to open",
      tapToContinue: "Tap to continue",
      openMaps: "View Venue",
      addCalendar: "Add to Calendar",
      finalBlessing: "Your presence will make\nour special day even more meaningful.",
      withLove: "With Love,",
      contactsLabel: "For any queries",
      back: "Back",
      starsTitle: "Our Little Stars",
      starsMessage: "Sending lots of love and blessings\nto Dhiraj & Tanu.",
      langTitle: "Our Wedding Invitation",
      baratLine: "The Barat will depart from our residence in Village\u2013Parashi Chaklal, Post\u2013Ropan Chhapra, District\u2013Deoria at 5:30 PM."
    },
    hi: {
      ganesha: "श्री गणेशाय नमः",
      openingBlessing: "अपने परिवारजनों के आशीर्वाद के साथ",
      tapToOpen: "आमंत्रण खोलने के लिए स्पर्श करें",
      tapToContinue: "आगे बढ़ने के लिए स्पर्श करें",
      openMaps: "स्थान देखें",
      addCalendar: "कैलेंडर में जोड़ें",
      finalBlessing: "आपकी उपस्थिति हमारे लिए\nइस शुभ अवसर को और भी विशेष बनाएगी।",
      withLove: "स्नेह सहित,",
      contactsLabel: "किसी भी जानकारी हेतु संपर्क करें",
      back: "पीछे",
      starsTitle: "हमारे नन्हे सितारे",
      starsMessage: "दूल्हा-दुल्हन को ढेर सारा प्यार\nऔर शुभकामनाएँ।",
      langTitle: "हमारे विवाह का निमंत्रण",
      baratLine: "बारात हमारे निवास स्थान ग्राम\u2013परासी चकलाल, पोस्ट\u2013रोपन छपरा, जिला\u2013देवरिया से शाम 5:30 बजे प्रस्थान करेगी।"
    }
  }
};
