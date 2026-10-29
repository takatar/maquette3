// Coordonnées de démonstration : remplacer ces valeurs avant toute mise en ligne.
const HOTEL_NAME = 'Le Mondrian';
const WHATSAPP_NUMBER = '221771234567';
const HOTEL_CONTACT = {
  address: 'Route de Saly, quartier central',
  city: 'Saly Portudal, Mbour, Sénégal',
  phone: '+221 77 123 45 67',
  email: 'contact@lemondrian-saly.example',
  location: 'Saly Portudal, Sénégal',
};
const RESERVATION_MESSAGE = `Bonjour ${HOTEL_NAME}, je souhaite obtenir des informations sur les disponibilités et les modalités de réservation de votre résidence à Saly Portudal. Pourriez-vous m'aider à préparer mon séjour ?`;
const WHATSAPP_RESERVATION_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(RESERVATION_MESSAGE)}`;

const currentPage = document.body.dataset.page || 'accueil';
// L'export statique définit data-base="./" ou "../" ; le site de développement reste à la racine.
const SITE_BASE = document.body.dataset.base || '/';
const sitePath = (path = '') => `${SITE_BASE}${path}`;
const sitePage = (name) => SITE_BASE === '/' ? `/${name}` : sitePath(`${name}/`);
const icon = (name, className = '') => `<svg class="icon ${className}" aria-hidden="true"><use href="${sitePath('assets/icons.svg')}#${name}"></use></svg>`;
const logo = `<span class="logo-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="logo-type">LE <strong>MONDRIAN</strong><small>SALY PORTUDAL · SÉNÉGAL</small></span>`;
const pages = [['accueil', sitePath(), 'Accueil'], ['presentation', sitePage('presentation'), 'Présentation'], ['services', sitePage('services'), 'Services'], ['contact', sitePage('contact'), 'Contact']];
const navLinks = pages.map(([key, url, title]) => `<a href="${url}"${currentPage === key ? ' aria-current="page"' : ''}>${title}</a>`).join('');

document.querySelector('[data-header]').innerHTML = `
  <a class="skip-link" href="#contenu">Aller au contenu</a>
  <div class="header-inner container">
    <a class="brand" href="${sitePath()}" aria-label="Le Mondrian, accueil">${logo}</a>
    <nav class="primary-nav" id="primary-navigation" aria-label="Navigation principale" data-navigation>${navLinks}</nav>
    <a class="header-book" data-reservation href="#" aria-label="Réservation sur WhatsApp (numéro de démonstration)">${icon('whatsapp')}<span>Réservation</span>${icon('diagonal', 'arrow-icon')}</a>
    <button class="menu-toggle" type="button" aria-label="Ouvrir le menu" aria-controls="primary-navigation" aria-expanded="false" data-menu-toggle><span></span><span></span></button>
  </div>`;

document.querySelector('[data-footer]').innerHTML = `
  <div class="container footer-main">
    <div class="footer-about"><a class="brand brand-footer" href="${sitePath()}" aria-label="Le Mondrian, accueil">${logo}</a><p>Une résidence hôtelière de 17 chambres, au cœur de Saly Portudal. Une autre manière de séjourner au Sénégal.</p><div class="footer-grid-art" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div></div>
    <div class="footer-col"><h2>Explorer</h2><nav aria-label="Navigation de pied de page">${navLinks}</nav></div>
    <div class="footer-col footer-contact"><h2>Restons en contact</h2><p>${HOTEL_CONTACT.location}</p><p>${HOTEL_CONTACT.phone}<br><span class="demo-tag">Coordonnées de démonstration</span></p><a class="footer-wa" data-reservation href="#" aria-label="Écrire sur WhatsApp (numéro de démonstration)">${icon('whatsapp')} Écrivez-nous ${icon('diagonal')}</a></div>
  </div>
  <div class="container footer-bottom"><span>© ${new Date().getFullYear()} Le Mondrian. Maquette de démonstration.</span><div><a href="${sitePath('contact/')}#mentions-legales">Mentions légales</a><a href="${sitePath('contact/')}#confidentialite">Confidentialité</a></div><span>Imaginé à Saly <b class="red-square" aria-hidden="true"></b></span></div>`;

document.querySelector('[data-floating-whatsapp]').innerHTML = `<a data-reservation href="#" aria-label="Contacter Le Mondrian sur WhatsApp (numéro de démonstration)" title="Écrire sur WhatsApp">${icon('whatsapp')}</a>`;

document.querySelectorAll('[data-contact-address]').forEach((element) => { element.innerHTML = `${HOTEL_CONTACT.address}<br>${HOTEL_CONTACT.city}`; });
document.querySelectorAll('[data-contact-phone]').forEach((element) => { element.textContent = HOTEL_CONTACT.phone; });
document.querySelectorAll('[data-contact-email]').forEach((element) => { element.textContent = HOTEL_CONTACT.email; });
document.querySelectorAll('[data-contact-location]').forEach((element) => { element.textContent = HOTEL_CONTACT.location; });

document.querySelectorAll('[data-reservation]').forEach((link) => {
  link.href = WHATSAPP_RESERVATION_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
});

const menuButton = document.querySelector('[data-menu-toggle]');
const navigation = document.querySelector('[data-navigation]');

if (menuButton && navigation) {
  const closeMenu = () => {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir le menu');
  };

  menuButton.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
  });

  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!navigation.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
}