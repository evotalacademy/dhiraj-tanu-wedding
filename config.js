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

  families: {
    en: {
      groomParents: "Markandey & Chandrashila Devi",
      brideParents: "Sudhir & Santosh Devi"
    },
    hi: {
      groomParents: "मारकंडेय एवं चंद्रशीला देवी",
      brideParents: "सुधीर एवं संतोष देवी"
    }
  },

  // Used to build the live countdown. Format: "YYYY-MM-DDTHH:mm:ss"
  // This is in IST (India). If hosted for guests elsewhere, the
  // countdown still targets this exact wall-clock instant.
  weddingDateTimeISTOffset: "2026-12-02T19:00:00+05:30",

  // Google Maps destination for the wedding venue.
  // Replace the "query" with your real Google Maps pin text or
  // "lat,lng" if you have exact coordinates.
  venueMapQuery: "Tejashvi Palace, Lar Bazar Thana Road, Deoria Salempur Rd, 274502",

  events: {
    mehndi: {
      title: { en: "Mehndi & Sangeet", hi: "मेहंदी एवं संगीत" },
      date: { en: "1 December 2026", hi: "1 दिसंबर 2026" },
      day: { en: "Tuesday", hi: "मंगलवार" },
      time: { en: "7:00 PM", hi: "शाम 7:00 बजे" },
      venue: { en: "At Home", hi: "निवास स्थान पर" },
      address: {
        en: "Parashi Chaklal, Post – Ropan Chhapra,\nDistrict – Deoria, Uttar Pradesh",
        hi: "पराशी चकलाल, पोस्ट – रोपन छपरा,\nजिला – देवरिया, उत्तर प्रदेश"
      }
    },
    haldi: {
      title: { en: "Haldi", hi: "हल्दी" },
      date: { en: "2 December 2026", hi: "2 दिसंबर 2026" },
      day: { en: "Wednesday", hi: "बुधवार" },
      time: { en: "12:00 PM", hi: "दोपहर 12:00 बजे" },
      venue: { en: "At Home", hi: "निवास स्थान पर" },
      address: {
        en: "Parashi Chaklal, Post – Ropan Chhapra,\nDistrict – Deoria, Uttar Pradesh",
        hi: "पराशी चकलाल, पोस्ट – रोपन छपरा,\nजिला – देवरिया, उत्तर प्रदेश"
      }
    },
    wedding: {
      title: { en: "The Wedding", hi: "शुभ विवाह" },
      date: { en: "2 December 2026", hi: "2 दिसंबर 2026" },
      day: { en: "Wednesday", hi: "बुधवार" },
      time: { en: "7:00 PM", hi: "शाम 7:00 बजे" },
      venue: { en: "Tejashvi Palace", hi: "तेजस्वी पैलेस" },
      address: {
        en: "Lar Bazar Thana Road, Deoria Salempur Rd, 274502",
        hi: "लार बाजार थाना रोड, देवरिया सलेमपुर रोड, 274502"
      }
    }
  },

  // ICS calendar file content is generated from this (see script.js).
  calendarEvent: {
    title: "Dhiraj & Tanu — Wedding",
    location: "Tejashvi Palace, Lar Bazar Thana Road, Deoria Salempur Rd, 274502",
    // Duration of the calendar block, in hours, from the wedding start time.
    durationHours: 4
  },

  copy: {
    en: {
      openingBlessing: "With the blessings of our families",
      familyAnd: "and",
      tapToBegin: "Tap to begin",
      tapToContinue: "Tap to continue",
      countdownLabel: "Counting down to forever",
      days: "Days", hours: "Hours", minutes: "Minutes",
      venueDetailsTitle: "The Wedding",
      openMaps: "Open in Google Maps",
      addCalendar: "Add to Calendar",
      finalMessage: "With love and blessings,\nwe look forward to celebrating\nthis beautiful beginning with you.",
      finalRSVP: "We would be honoured by your presence\non our special day.",
      replay: "Replay Invitation",
      familyBlessing: "With the blessings of our families",
      back: "Back"
    },
    hi: {
      openingBlessing: "अपने परिवारजनों के आशीर्वाद के साथ",
      familyAnd: "तथा",
      tapToBegin: "आरंभ करने हेतु स्पर्श करें",
      tapToContinue: "आगे बढ़ने हेतु स्पर्श करें",
      countdownLabel: "हमारे मिलन की उलटी गिनती",
      days: "दिन", hours: "घंटे", minutes: "मिनट",
      venueDetailsTitle: "शुभ विवाह",
      openMaps: "गूगल मैप्स में खोलें",
      addCalendar: "कैलेंडर में जोड़ें",
      finalMessage: "स्नेह और आशीर्वाद सहित,\nहम अपने जीवन की इस\nसुंदर शुरुआत में आपका\nस्वागत करने हेतु आतुर हैं।",
      finalRSVP: "इस विशेष अवसर पर आपकी उपस्थिति\nहमारे लिए सौभाग्य की बात होगी।",
      replay: "पुनः देखें",
      familyBlessing: "अपने माता-पिता के आशीर्वाद के साथ",
      back: "पीछे"
    }
  }
};
