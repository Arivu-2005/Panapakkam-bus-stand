/* Panapakkam bus stand timetable data (scheduled times only, NOT live tracking).
   Source: Panapakkam bus stand board photos. Grouped by destination: one route per town.
   To edit: change/add a row in a route's "rows" list. Row format:
     ["HH:MM AM/PM", "Bus name (English)", "Bus name (Tamil, or empty '')"]
   Optional 4th item: true  -> marks the row "Check board" (hard to read)
   Never guess a missing time or bus number: leave it out or set the 4th item to true.
   Each row expands to: time, bus, busTa, dest ("Panapakkam → Town"), destTa, verify
*/
(function () {
  function mk(town, townTa, rows) {
    return rows.map(function (r) {
      var o = {
        time: r[0],
        bus: r[1],
        dest: "Panapakkam → " + town,
        destTa: "பனப்பாக்கம் → " + townTa
      };
      if (r[2]) o.busTa = r[2];
      if (r[3]) o.verify = true;
      return o;
    });
  }

  window.TIMETABLE = {
    source: "Panapakkam bus stand timetable",
    routes: [
      /* 1. VELLORE */
      { id: "vellore", name: "Vellore", tamil: "வேலூர்", bay: 1, color: "#1d3bd1",
        entries: mk("Vellore", "வேலூர்", [
          ["04:30 AM", "M.S. Roadways (VDM)", "M.S. ரோட்வேஸ் (VDM)"],
          ["04:50 AM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["05:35 AM", "Bharathi Motors (LSS)", "பாரதி மோட்டார்ஸ் (LSS)"],
          ["06:35 AM", "486", ""],
          ["07:00 AM", "Bharathi Motors (Super)", "பாரதி மோட்டார்ஸ் (சூப்பர்)"],
          ["07:30 AM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["07:50 AM", "486", ""],
          ["08:10 AM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["08:30 AM", "486 D (via Thakkolam)", "486 D (வழி தக்கோலம்)"],
          ["09:50 AM", "Dhanapathi", "தனபதி"],
          ["10:35 AM", "M.S. Roadways (VDM)", "M.S. ரோட்வேஸ் (VDM)"],
          ["11:15 AM", "486", ""],
          ["11:30 AM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["12:15 PM", "M.S. Roadways (VDM)", "M.S. ரோட்வேஸ் (VDM)"],
          ["12:45 PM", "486", ""],
          ["01:00 PM", "Bharathi Motors (LSS)", "பாரதி மோட்டார்ஸ் (LSS)"],
          ["01:55 PM", "486", ""],
          ["02:20 PM", "Dhanapathi", "தனபதி"],
          ["02:45 PM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["03:00 PM", "486", ""],
          ["03:20 PM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["03:45 PM", "Dhanapathi", "தனபதி"],
          ["05:05 PM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["05:20 PM", "M.S. Roadways (VDM)", "M.S. ரோட்வேஸ் (VDM)"],
          ["05:40 PM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["06:00 PM", "486", ""],
          ["06:30 PM", "486", ""],
          ["07:10 PM", "Bharathi Motors (LSS)", "பாரதி மோட்டார்ஸ் (LSS)"],
          ["08:00 PM", "486", ""],
          ["08:25 PM", "VDM / M.S. Roadways", "VDM / M.S. ரோட்வேஸ்"],
          ["08:35 PM", "486", ""],
          ["08:40 PM", "Dhanapathi", "தனபதி"],
          ["09:20 PM", "Dhanapathi", "தனபதி"],
          ["09:25 PM", "486", ""]
        ]) },

      /* 2. ARCOT */
      { id: "arcot", name: "Arcot", tamil: "ஆற்காடு", bay: 1, color: "#1d3bd1",
        entries: mk("Arcot", "ஆற்காடு", [
          ["03:45 AM", "Town bus 23", "நகரப்பேருந்து 23"],
          ["05:45 AM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["07:10 AM", "Town bus 23", "நகரப்பேருந்து 23"],
          ["07:15 AM", "Kalaimagal", "கலைமகள்"],
          ["08:45 AM", "Bharathi Motors", "பாரதி மோட்டார்ஸ்"],
          ["09:30 AM", "Kalaimagal", "கலைமகள்"],
          ["09:40 AM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["10:25 AM", "Town bus 23", "நகரப்பேருந்து 23"],
          ["01:30 PM", "Town bus 23", "நகரப்பேருந்து 23"],
          ["01:45 PM", "Bharathi Motors", "பாரதி மோட்டார்ஸ்"],
          ["02:35 PM", "Kalaimagal", "கலைமகள்"],
          ["04:40 PM", "Town bus 23", "நகரப்பேருந்து 23"],
          ["05:00 PM", "Kalaimagal", "கலைமகள்"],
          ["05:45 PM", "Thulasi", "துளசி"],
          ["06:20 PM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["07:25 PM", "Town bus 23", "நகரப்பேருந்து 23"],
          ["07:40 PM", "Kalaimagal", "கலைமகள்"]
        ]) },

      /* 3. KAVERIPAKKAM */
      { id: "kaveripakkam", name: "Kaveripakkam", tamil: "காவேரிப்பாக்கம்", bay: 1, color: "#1d3bd1",
        entries: mk("Kaveripakkam", "காவேரிப்பாக்கம்", [
          ["06:15 PM", "Balaji", "பாலாஜி"],
          ["07:45 PM", "Bharathi Motors", "பாரதி மோட்டார்ஸ்"]
        ]) },

      /* 4. ARAKKONAM */
      { id: "arakkonam", name: "Arakkonam", tamil: "அரக்கோணம்", bay: 2, color: "#0f8a5f",
        entries: mk("Arakkonam", "அரக்கோணம்", [
          ["04:50 AM", "Bharathi Motors", "பாரதி மோட்டார்ஸ்"],
          ["05:30 AM", "486", ""],
          ["05:40 AM", "Balaji", "பாலாஜி"],
          ["06:05 AM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["07:30 AM", "Dhanapathi", "தனபதி"],
          ["08:05 AM", "Balaji", "பாலாஜி"],
          ["09:15 AM", "486", ""],
          ["10:15 AM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["10:20 AM", "486", ""],
          ["11:00 AM", "Bharathi Motors", "பாரதி மோட்டார்ஸ்"],
          ["11:20 AM", "486", ""],
          ["11:35 AM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["11:45 AM", "Bharathi Motors", "பாரதி மோட்டார்ஸ்"],
          ["12:05 PM", "Dhanapathi", "தனபதி"],
          ["12:25 PM", "486", ""],
          ["12:35 PM", "Balaji", "பாலாஜி"],
          ["01:45 PM", "Dhanapathi", "தனபதி"],
          ["02:40 PM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["03:45 PM", "486", ""],
          ["04:35 PM", "486", ""],
          ["05:00 PM", "Bharathi Motors", "பாரதி மோட்டார்ஸ்"],
          ["05:15 PM", "Bharathi Motors (LSS)", "பாரதி மோட்டார்ஸ் (LSS)"],
          ["05:45 PM", "Dhanapathi", "தனபதி"],
          ["06:15 PM", "486", ""],
          ["07:15 PM", "Bharathi Motors", "பாரதி மோட்டார்ஸ்"],
          ["07:20 PM", "Dhanapathi", "தனபதி"],
          ["07:35 PM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["07:50 PM", "Balaji", "பாலாஜி"],
          ["08:35 PM", "486", ""],
          ["09:50 PM", "Vijayalakshmi", "விஜயலட்சுமி"]
        ]) },

      /* 5. THAKKOLAM */
      { id: "thakkolam", name: "Thakkolam", tamil: "தக்கோலம்", bay: 2, color: "#0f8a5f",
        entries: mk("Thakkolam", "தக்கோலம்", [
          ["06:35 AM", "486", ""],
          ["06:45 PM", "486", ""]
        ]) },

      /* 6. GURUVARAJAPETTAI */
      { id: "guruvarajapettai", name: "Guruvarajapettai", tamil: "குருவராஜபேட்டை", bay: 2, color: "#0f8a5f",
        entries: mk("Guruvarajapettai", "குருவராஜபேட்டை", [
          ["06:55 PM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"]
        ]) },

      /* 7. THIRUTHANI */
      { id: "thiruthani", name: "Thiruthani", tamil: "திருத்தணி", bay: 2, color: "#0f8a5f",
        entries: mk("Thiruthani", "திருத்தணி", [
          ["06:25 AM", "M.S. Roadways (VDM)", "M.S. ரோட்வேஸ் (VDM)"],
          ["08:25 AM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["08:50 AM", "M.S. Roadways (VDM)", "M.S. ரோட்வேஸ் (VDM)"],
          ["09:45 AM", "Bharathi Motors (LSS)", "பாரதி மோட்டார்ஸ் (LSS)"],
          ["01:05 PM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["02:25 PM", "M.S. Roadways (VDM)", "M.S. ரோட்வேஸ் (VDM)"],
          ["03:15 PM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["04:20 PM", "M.S. Roadways (VDM)", "M.S. ரோட்வேஸ் (VDM)"],
          ["09:10 PM", "Bharathi Roadways", "பாரதி ரோட்வேஸ்"],
          ["09:25 PM", "M.S. Roadways (VDM)", "M.S. ரோட்வேஸ் (VDM)"],
          ["10:10 PM", "Bharathi Motors (LSS)", "பாரதி மோட்டார்ஸ் (LSS)"]
        ]) },

      /* 8. KANCHIPURAM */
      { id: "kanchipuram", name: "Kanchipuram", tamil: "காஞ்சிபுரம்", bay: 3, color: "#c2410c",
        entries: mk("Kanchipuram", "காஞ்சிபுரம்", [
          ["04:50 AM", "Town bus T3A", "நகரப்பேருந்து T3A"],
          ["05:10 AM", "Town bus T3B LSS", "நகரப்பேருந்து T3B LSS"],
          ["05:20 AM", "Town bus T3", "நகரப்பேருந்து T3"],
          ["06:15 AM", "Town bus T3", "நகரப்பேருந்து T3"],
          ["06:45 AM", "Town bus T49 (via Koor)", "நகரப்பேருந்து T49 (வழி கூர்)"],
          ["07:30 AM", "Bharathi Roadways via Thirumalpur", "பாரதி ரோட்வேஸ் வழி திருமால்பூர்"],
          ["07:45 AM", "Town bus T3A", "நகரப்பேருந்து T3A"],
          ["08:00 AM", "Town bus T3 via Thirumalpur", "நகரப்பேருந்து T3 வழி திருமால்பூர்"],
          ["08:20 AM", "Town bus T3B LSS", "நகரப்பேருந்து T3B LSS"],
          ["08:20 AM", "Town bus T3 via Thirumalpur", "நகரப்பேருந்து T3 வழி திருமால்பூர்"],
          ["08:30 AM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["09:00 AM", "Town bus 77", "நகரப்பேருந்து 77"],
          ["09:30 AM", "M.B.D.", ""],
          ["10:20 AM", "Town bus T3 via Jagirthandalam", "நகரப்பேருந்து T3 வழி ஜாகீர்தண்டலம்"],
          ["10:30 AM", "Town bus T3 LSS", "நகரப்பேருந்து T3 LSS"],
          ["10:45 AM", "Town bus T3A", "நகரப்பேருந்து T3A"],
          ["11:20 AM", "Town bus 77", "நகரப்பேருந்து 77"],
          ["11:30 AM", "KRC via Thirumalpur", "KRC வழி திருமால்பூர்"],
          ["12:10 PM", "Town bus T3 LSS", "நகரப்பேருந்து T3 LSS"],
          ["12:30 PM", "M.B.D.", ""],
          ["12:35 PM", "Bharathi Roadways via Thirumalpur", "பாரதி ரோட்வேஸ் வழி திருமால்பூர்"],
          ["12:40 PM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["12:45 PM", "Town bus 49A (via Koor)", "நகரப்பேருந்து 49A (வழி கூர்)"],
          ["01:45 PM", "Town bus T3A", "நகரப்பேருந்து T3A"],
          ["02:15 PM", "Town bus T3 via Thirumalpur", "நகரப்பேருந்து T3 வழி திருமால்பூர்"],
          ["03:30 PM", "M.B.D.", ""],
          ["04:35 PM", "Bharathi Roadways via Thirumalpur", "பாரதி ரோட்வேஸ் வழி திருமால்பூர்"],
          ["04:45 PM", "Town bus T3 via Thirumalpur", "நகரப்பேருந்து T3 வழி திருமால்பூர்"],
          ["05:30 PM", "Vijayalakshmi", "விஜயலட்சுமி"],
          ["05:45 PM", "Town bus T3A", "நகரப்பேருந்து T3A"],
          ["05:50 PM", "Town bus 49A (via Koor)", "நகரப்பேருந்து 49A (வழி கூர்)"],
          ["06:00 PM", "Town bus T3 LSS", "நகரப்பேருந்து T3 LSS"],
          ["06:30 PM", "M.B.D.", ""],
          ["07:00 PM", "Town bus T3 via Jagirthandalam", "நகரப்பேருந்து T3 வழி ஜாகீர்தண்டலம்"],
          ["08:30 PM", "Town bus T3 LSS", "நகரப்பேருந்து T3 LSS"],
          ["08:45 PM", "Bharathi Roadways via Thirumalpur", "பாரதி ரோட்வேஸ் வழி திருமால்பூர்"]
        ]) },

      /* 9. CHENNAI */
      { id: "chennai", name: "Chennai", tamil: "சென்னை", bay: 3, color: "#c2410c",
        entries: mk("Chennai", "சென்னை", [
          ["05:00 AM", "107 (via Thakkolam)", "107 (வழி தக்கோலம்)"],
          ["06:15 AM", "76B via Thirumalpur", "76B வழி திருமால்பூர்"],
          ["07:20 AM", "76B", ""],
          ["01:30 PM", "150", ""],
          ["03:00 PM", "107 (via Thakkolam)", "107 (வழி தக்கோலம்)"],
          ["04:30 PM", "76B", ""],
          ["07:30 PM", "89C via Thirumalpur", "89C வழி திருமால்பூர்"]
        ]) },

      /* 10. CHENGALPATTU */
      { id: "chengalpattu", name: "Chengalpattu", tamil: "செங்கல்பட்டு", bay: 3, color: "#c2410c",
        entries: mk("Chengalpattu", "செங்கல்பட்டு", [
          ["05:45 AM", "KRC via Thirumalpur", "KRC வழி திருமால்பூர்"]
        ]) },

      /* 11. TAMBARAM */
      { id: "tambaram", name: "Tambaram", tamil: "தாம்பரம்", bay: 3, color: "#c2410c",
        entries: mk("Tambaram", "தாம்பரம்", [
          ["06:00 AM", "79", ""]
        ]) },

      /* 12. KALATHUR */
      { id: "kalathur", name: "Kalathur", tamil: "களத்தூர்", bay: 4, color: "#7c3aed",
        entries: mk("Kalathur", "களத்தூர்", [
          ["05:45 PM", "Small bus", "சிற்றுந்து"],
          ["07:15 PM", "Small bus", "சிற்றுந்து"],
          ["09:45 PM", "Small bus", "சிற்றுந்து"],
          ["11:30 PM", "Small bus", "சிற்றுந்து"],
          ["02:45 PM", "Small bus", "சிற்றுந்து"],
          ["05:15 PM", "Small bus", "சிற்றுந்து"],
          ["07:30 PM", "Small bus", "சிற்றுந்து"]
        ]) },

      /* 13. SHOLINGHUR */
      { id: "sholinghur", name: "Sholinghur", tamil: "சோளிங்கர்", bay: 4, color: "#7c3aed",
        entries: mk("Sholinghur", "சோளிங்கர்", [
          ["05:30 AM", "Town bus 51A", "நகரப்பேருந்து 51A"],
          ["08:40 PM", "Town bus 51A", "நகரப்பேருந்து 51A", true]
        ]) }

    ]
  };
})();