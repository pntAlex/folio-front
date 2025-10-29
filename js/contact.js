/*--------------------------------------------------
Function Contact Formular
---------------------------------------------------*/

function ContactForm() {
  if ($("#contact-formular").length > 0) {
    $("#contactform").submit(function (e) {
      e.preventDefault();
      
      const name = $("#name").val();
      const message = $("#comments").val();
      const verify = $("#verify").val();
      
      // Simple verification check (1 + 3 = 4)
      if (verify !== "4") {
        alert("Vérifie que tu es bien un humain en résolvant ce problème mathématique complexe :)");
        return false;
      }

      // Construct email body
      const subject = `Nouvelle demande de contact de ${name}`;
      
      // Create mailto URL
      const mailtoUrl = `mailto:a_pinot@icloud.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      
      // Open default mail client
      window.location.href = mailtoUrl;
      
      return false;
    });
  }
} //End ContactForm
