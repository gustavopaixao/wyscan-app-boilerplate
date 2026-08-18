/**
 * Auth copy for the eight locales the generated project ships.
 *
 * Defined ONCE in camelCase and reshaped for each consumer, so a new string
 * cannot land on web but go missing on mobile:
 *
 *   web    next-intl, nested   -> messages/<locale>.json  { "auth": { "signInTitle": ... } }
 *   mobile flat snake_case     -> locales/<locale>.json   { "auth_sign_in_title": ... }
 *
 * `{name}` placeholders are interpolated by both runtimes.
 */

const en = {
  signInTitle: "Sign in",
  signInSubtitle: "Welcome back.",
  signInSubmit: "Sign in",
  registerTitle: "Create your account",
  registerSubtitle: "It only takes a minute.",
  registerSubmit: "Create account",
  verifyTitle: "Verify your email",
  verifySubtitle: "We sent an 8-character code to {email}.",
  verifySubmit: "Verify",
  forgotTitle: "Forgot your password?",
  forgotSubtitle: "We will email you a code to reset it.",
  forgotSubmit: "Send reset code",
  resetTitle: "Choose a new password",
  resetSubtitle: "Enter the code we emailed you.",
  resetSubmit: "Update password",
  emailLabel: "Email",
  passwordLabel: "Password",
  newPasswordLabel: "New password",
  displayNameLabel: "Name",
  codeLabel: "Verification code",
  forgotLink: "Forgot password?",
  noAccount: "Don't have an account?",
  haveAccount: "Already have an account?",
  registerLink: "Sign up",
  signInLink: "Sign in",
  backToSignIn: "Back to sign in",
  resendCode: "Resend code",
  codeResent: "A new code is on its way.",
  signOut: "Sign out",
  orContinueWith: "or continue with",
  continueWithGoogle: "Continue with Google",
  continueWithApple: "Continue with Apple",
  legalNotice: "By continuing you agree to our Terms and Privacy Policy.",
  passwordHint: "At least 8 characters, with an uppercase letter and a number.",
  checkEmail: "If an account exists for that address, a code is on its way.",
  errorGeneric: "Something went wrong. Please try again.",
  errorInvalidCredentials: "Invalid email or password.",
  errorNetwork: "Could not reach the server. Check your connection.",
  loading: "Loading…",
  goRegister: "Need an account? Register",
  goLogin: "Already have an account? Sign in",
  showPassword: "Show password",
  hidePassword: "Hide password",
  legalNoticeRegister: "By creating an account you agree to our Terms and Privacy Policy.",
};

const ptBR = {
  signInTitle: "Entrar",
  signInSubtitle: "Bem-vindo de volta.",
  signInSubmit: "Entrar",
  registerTitle: "Crie sua conta",
  registerSubtitle: "Leva menos de um minuto.",
  registerSubmit: "Criar conta",
  verifyTitle: "Confirme seu e-mail",
  verifySubtitle: "Enviamos um código de 8 caracteres para {email}.",
  verifySubmit: "Confirmar",
  forgotTitle: "Esqueceu sua senha?",
  forgotSubtitle: "Enviaremos um código por e-mail para redefini-la.",
  forgotSubmit: "Enviar código",
  resetTitle: "Escolha uma nova senha",
  resetSubtitle: "Digite o código que enviamos por e-mail.",
  resetSubmit: "Atualizar senha",
  emailLabel: "E-mail",
  passwordLabel: "Senha",
  newPasswordLabel: "Nova senha",
  displayNameLabel: "Nome",
  codeLabel: "Código de verificação",
  forgotLink: "Esqueceu a senha?",
  noAccount: "Não tem uma conta?",
  haveAccount: "Já tem uma conta?",
  registerLink: "Cadastre-se",
  signInLink: "Entrar",
  backToSignIn: "Voltar para o login",
  resendCode: "Reenviar código",
  codeResent: "Um novo código está a caminho.",
  signOut: "Sair",
  orContinueWith: "ou continue com",
  continueWithGoogle: "Continuar com Google",
  continueWithApple: "Continuar com Apple",
  legalNotice: "Ao continuar, você concorda com nossos Termos e Política de Privacidade.",
  passwordHint: "Pelo menos 8 caracteres, com uma letra maiúscula e um número.",
  checkEmail: "Se existir uma conta para esse endereço, um código está a caminho.",
  errorGeneric: "Algo deu errado. Tente novamente.",
  errorInvalidCredentials: "E-mail ou senha inválidos.",
  errorNetwork: "Não foi possível conectar ao servidor. Verifique sua conexão.",
  loading: "Carregando…",
  goRegister: "Não tem conta? Cadastre-se",
  goLogin: "Já tem conta? Entre",
  showPassword: "Mostrar senha",
  hidePassword: "Ocultar senha",
  legalNoticeRegister: "Ao criar uma conta, você concorda com nossos Termos e Política de Privacidade.",
};

const ptPT = {
  ...ptBR,
  signInSubtitle: "Bem-vindo de volta.",
  registerSubtitle: "Demora menos de um minuto.",
  verifyTitle: "Confirme o seu e-mail",
  verifySubtitle: "Enviámos um código de 8 caracteres para {email}.",
  forgotTitle: "Esqueceu-se da palavra-passe?",
  forgotSubtitle: "Enviaremos um código por e-mail para a redefinir.",
  resetTitle: "Escolha uma nova palavra-passe",
  resetSubtitle: "Introduza o código que enviámos por e-mail.",
  resetSubmit: "Atualizar palavra-passe",
  passwordLabel: "Palavra-passe",
  newPasswordLabel: "Nova palavra-passe",
  forgotLink: "Esqueceu-se da palavra-passe?",
  noAccount: "Não tem conta?",
  haveAccount: "Já tem conta?",
  registerLink: "Registe-se",
  backToSignIn: "Voltar ao início de sessão",
  legalNotice: "Ao continuar, concorda com os nossos Termos e Política de Privacidade.",
  errorInvalidCredentials: "E-mail ou palavra-passe inválidos.",
  errorGeneric: "Algo correu mal. Tente novamente.",
  errorNetwork: "Não foi possível contactar o servidor. Verifique a sua ligação.",
  loading: "A carregar…",
  goRegister: "Não tem conta? Registe-se",
  goLogin: "Já tem conta? Inicie sessão",
  showPassword: "Mostrar palavra-passe",
  hidePassword: "Ocultar palavra-passe",
  legalNoticeRegister: "Ao criar uma conta, concorda com os nossos Termos e Política de Privacidade.",
};

const es = {
  signInTitle: "Iniciar sesión",
  signInSubtitle: "Bienvenido de nuevo.",
  signInSubmit: "Iniciar sesión",
  registerTitle: "Crea tu cuenta",
  registerSubtitle: "Solo te llevará un minuto.",
  registerSubmit: "Crear cuenta",
  verifyTitle: "Verifica tu correo",
  verifySubtitle: "Enviamos un código de 8 caracteres a {email}.",
  verifySubmit: "Verificar",
  forgotTitle: "¿Olvidaste tu contraseña?",
  forgotSubtitle: "Te enviaremos un código por correo para restablecerla.",
  forgotSubmit: "Enviar código",
  resetTitle: "Elige una nueva contraseña",
  resetSubtitle: "Introduce el código que te enviamos por correo.",
  resetSubmit: "Actualizar contraseña",
  emailLabel: "Correo electrónico",
  passwordLabel: "Contraseña",
  newPasswordLabel: "Nueva contraseña",
  displayNameLabel: "Nombre",
  codeLabel: "Código de verificación",
  forgotLink: "¿Olvidaste la contraseña?",
  noAccount: "¿No tienes cuenta?",
  haveAccount: "¿Ya tienes cuenta?",
  registerLink: "Regístrate",
  signInLink: "Iniciar sesión",
  backToSignIn: "Volver al inicio de sesión",
  resendCode: "Reenviar código",
  codeResent: "Un nuevo código está en camino.",
  signOut: "Cerrar sesión",
  orContinueWith: "o continúa con",
  continueWithGoogle: "Continuar con Google",
  continueWithApple: "Continuar con Apple",
  legalNotice: "Al continuar aceptas nuestros Términos y Política de Privacidad.",
  passwordHint: "Al menos 8 caracteres, con una mayúscula y un número.",
  checkEmail: "Si existe una cuenta para esa dirección, el código está en camino.",
  errorGeneric: "Algo salió mal. Inténtalo de nuevo.",
  errorInvalidCredentials: "Correo o contraseña incorrectos.",
  errorNetwork: "No se pudo conectar con el servidor. Comprueba tu conexión.",
  loading: "Cargando…",
  goRegister: "¿No tienes cuenta? Regístrate",
  goLogin: "¿Ya tienes cuenta? Inicia sesión",
  showPassword: "Mostrar contraseña",
  hidePassword: "Ocultar contraseña",
  legalNoticeRegister: "Al crear una cuenta aceptas nuestros Términos y Política de Privacidad.",
};

const fr = {
  signInTitle: "Se connecter",
  signInSubtitle: "Content de vous revoir.",
  signInSubmit: "Se connecter",
  registerTitle: "Créez votre compte",
  registerSubtitle: "Cela ne prend qu'une minute.",
  registerSubmit: "Créer un compte",
  verifyTitle: "Vérifiez votre e-mail",
  verifySubtitle: "Nous avons envoyé un code de 8 caractères à {email}.",
  verifySubmit: "Vérifier",
  forgotTitle: "Mot de passe oublié ?",
  forgotSubtitle: "Nous vous enverrons un code par e-mail pour le réinitialiser.",
  forgotSubmit: "Envoyer le code",
  resetTitle: "Choisissez un nouveau mot de passe",
  resetSubtitle: "Saisissez le code reçu par e-mail.",
  resetSubmit: "Mettre à jour",
  emailLabel: "E-mail",
  passwordLabel: "Mot de passe",
  newPasswordLabel: "Nouveau mot de passe",
  displayNameLabel: "Nom",
  codeLabel: "Code de vérification",
  forgotLink: "Mot de passe oublié ?",
  noAccount: "Vous n'avez pas de compte ?",
  haveAccount: "Vous avez déjà un compte ?",
  registerLink: "S'inscrire",
  signInLink: "Se connecter",
  backToSignIn: "Retour à la connexion",
  resendCode: "Renvoyer le code",
  codeResent: "Un nouveau code est en route.",
  signOut: "Se déconnecter",
  orContinueWith: "ou continuer avec",
  continueWithGoogle: "Continuer avec Google",
  continueWithApple: "Continuer avec Apple",
  legalNotice: "En continuant, vous acceptez nos Conditions et notre Politique de confidentialité.",
  passwordHint: "Au moins 8 caractères, avec une majuscule et un chiffre.",
  checkEmail: "Si un compte existe pour cette adresse, un code est en route.",
  errorGeneric: "Une erreur est survenue. Veuillez réessayer.",
  errorInvalidCredentials: "E-mail ou mot de passe invalide.",
  errorNetwork: "Impossible de joindre le serveur. Vérifiez votre connexion.",
  loading: "Chargement…",
  goRegister: "Pas de compte ? S'inscrire",
  goLogin: "Vous avez déjà un compte ? Se connecter",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  legalNoticeRegister: "En créant un compte, vous acceptez nos Conditions et notre Politique de confidentialité.",
};

const de = {
  signInTitle: "Anmelden",
  signInSubtitle: "Willkommen zurück.",
  signInSubmit: "Anmelden",
  registerTitle: "Konto erstellen",
  registerSubtitle: "Dauert nur eine Minute.",
  registerSubmit: "Konto erstellen",
  verifyTitle: "E-Mail bestätigen",
  verifySubtitle: "Wir haben einen 8-stelligen Code an {email} gesendet.",
  verifySubmit: "Bestätigen",
  forgotTitle: "Passwort vergessen?",
  forgotSubtitle: "Wir senden dir einen Code zum Zurücksetzen per E-Mail.",
  forgotSubmit: "Code senden",
  resetTitle: "Neues Passwort wählen",
  resetSubtitle: "Gib den Code ein, den wir dir gesendet haben.",
  resetSubmit: "Passwort aktualisieren",
  emailLabel: "E-Mail",
  passwordLabel: "Passwort",
  newPasswordLabel: "Neues Passwort",
  displayNameLabel: "Name",
  codeLabel: "Bestätigungscode",
  forgotLink: "Passwort vergessen?",
  noAccount: "Noch kein Konto?",
  haveAccount: "Schon ein Konto?",
  registerLink: "Registrieren",
  signInLink: "Anmelden",
  backToSignIn: "Zurück zur Anmeldung",
  resendCode: "Code erneut senden",
  codeResent: "Ein neuer Code ist unterwegs.",
  signOut: "Abmelden",
  orContinueWith: "oder weiter mit",
  continueWithGoogle: "Weiter mit Google",
  continueWithApple: "Weiter mit Apple",
  legalNotice: "Mit dem Fortfahren stimmst du unseren AGB und der Datenschutzerklärung zu.",
  passwordHint: "Mindestens 8 Zeichen, mit einem Großbuchstaben und einer Zahl.",
  checkEmail: "Falls ein Konto für diese Adresse existiert, ist ein Code unterwegs.",
  errorGeneric: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  errorInvalidCredentials: "E-Mail oder Passwort ist ungültig.",
  errorNetwork: "Server nicht erreichbar. Prüfe deine Verbindung.",
  loading: "Wird geladen…",
  goRegister: "Noch kein Konto? Registrieren",
  goLogin: "Schon ein Konto? Anmelden",
  showPassword: "Passwort anzeigen",
  hidePassword: "Passwort verbergen",
  legalNoticeRegister: "Mit der Kontoerstellung stimmst du unseren AGB und der Datenschutzerklärung zu.",
};

const it = {
  signInTitle: "Accedi",
  signInSubtitle: "Bentornato.",
  signInSubmit: "Accedi",
  registerTitle: "Crea il tuo account",
  registerSubtitle: "Ci vuole meno di un minuto.",
  registerSubmit: "Crea account",
  verifyTitle: "Verifica la tua email",
  verifySubtitle: "Abbiamo inviato un codice di 8 caratteri a {email}.",
  verifySubmit: "Verifica",
  forgotTitle: "Password dimenticata?",
  forgotSubtitle: "Ti invieremo un codice via email per reimpostarla.",
  forgotSubmit: "Invia codice",
  resetTitle: "Scegli una nuova password",
  resetSubtitle: "Inserisci il codice che ti abbiamo inviato.",
  resetSubmit: "Aggiorna password",
  emailLabel: "Email",
  passwordLabel: "Password",
  newPasswordLabel: "Nuova password",
  displayNameLabel: "Nome",
  codeLabel: "Codice di verifica",
  forgotLink: "Password dimenticata?",
  noAccount: "Non hai un account?",
  haveAccount: "Hai già un account?",
  registerLink: "Registrati",
  signInLink: "Accedi",
  backToSignIn: "Torna all'accesso",
  resendCode: "Invia di nuovo il codice",
  codeResent: "Un nuovo codice è in arrivo.",
  signOut: "Esci",
  orContinueWith: "oppure continua con",
  continueWithGoogle: "Continua con Google",
  continueWithApple: "Continua con Apple",
  legalNotice: "Continuando accetti i nostri Termini e la Privacy Policy.",
  passwordHint: "Almeno 8 caratteri, con una maiuscola e un numero.",
  checkEmail: "Se esiste un account per questo indirizzo, il codice è in arrivo.",
  errorGeneric: "Qualcosa è andato storto. Riprova.",
  errorInvalidCredentials: "Email o password non validi.",
  errorNetwork: "Impossibile raggiungere il server. Controlla la connessione.",
  loading: "Caricamento…",
  goRegister: "Non hai un account? Registrati",
  goLogin: "Hai già un account? Accedi",
  showPassword: "Mostra password",
  hidePassword: "Nascondi password",
  legalNoticeRegister: "Creando un account accetti i nostri Termini e la Privacy Policy.",
};

const nl = {
  signInTitle: "Inloggen",
  signInSubtitle: "Welkom terug.",
  signInSubmit: "Inloggen",
  registerTitle: "Maak je account aan",
  registerSubtitle: "Het duurt maar een minuut.",
  registerSubmit: "Account aanmaken",
  verifyTitle: "Bevestig je e-mail",
  verifySubtitle: "We hebben een code van 8 tekens naar {email} gestuurd.",
  verifySubmit: "Bevestigen",
  forgotTitle: "Wachtwoord vergeten?",
  forgotSubtitle: "We mailen je een code om het opnieuw in te stellen.",
  forgotSubmit: "Code versturen",
  resetTitle: "Kies een nieuw wachtwoord",
  resetSubtitle: "Voer de code in die we je hebben gemaild.",
  resetSubmit: "Wachtwoord bijwerken",
  emailLabel: "E-mail",
  passwordLabel: "Wachtwoord",
  newPasswordLabel: "Nieuw wachtwoord",
  displayNameLabel: "Naam",
  codeLabel: "Verificatiecode",
  forgotLink: "Wachtwoord vergeten?",
  noAccount: "Nog geen account?",
  haveAccount: "Heb je al een account?",
  registerLink: "Registreren",
  signInLink: "Inloggen",
  backToSignIn: "Terug naar inloggen",
  resendCode: "Code opnieuw versturen",
  codeResent: "Er is een nieuwe code onderweg.",
  signOut: "Uitloggen",
  orContinueWith: "of ga verder met",
  continueWithGoogle: "Doorgaan met Google",
  continueWithApple: "Doorgaan met Apple",
  legalNotice: "Door door te gaan ga je akkoord met onze Voorwaarden en Privacyverklaring.",
  passwordHint: "Minstens 8 tekens, met een hoofdletter en een cijfer.",
  checkEmail: "Als er een account bestaat voor dit adres, is er een code onderweg.",
  errorGeneric: "Er ging iets mis. Probeer het opnieuw.",
  errorInvalidCredentials: "Ongeldig e-mailadres of wachtwoord.",
  errorNetwork: "Kan de server niet bereiken. Controleer je verbinding.",
  loading: "Laden…",
  goRegister: "Nog geen account? Registreren",
  goLogin: "Heb je al een account? Inloggen",
  showPassword: "Wachtwoord tonen",
  hidePassword: "Wachtwoord verbergen",
  legalNoticeRegister: "Door een account aan te maken ga je akkoord met onze Voorwaarden en Privacyverklaring.",
};


/* -------------------------------------------------------------------------
 * Navigation copy.
 *
 * A separate namespace from the auth strings above: these label the tab bar,
 * the toolbar and the account menu, and prefixing them `auth_` on mobile read
 * as though the tab bar belonged to sign-in.
 * ------------------------------------------------------------------------- */

const nav_en = {
  menuOpen: "Open account menu",
  menuClose: "Close menu",
  menuProfile: "Profile",
  menuSettings: "Settings",
  toolbarBack: "Back",
  tabHome: "Home",
  tabExplore: "Explore",
  tabProfile: "Profile",
};

const nav_ptBR = {
  menuOpen: "Abrir menu da conta",
  menuClose: "Fechar menu",
  menuProfile: "Perfil",
  menuSettings: "Configurações",
  toolbarBack: "Voltar",
  tabHome: "Início",
  tabExplore: "Explorar",
  tabProfile: "Perfil",
};

const nav_ptPT = {
  menuOpen: "Abrir menu da conta",
  menuClose: "Fechar menu",
  menuProfile: "Perfil",
  menuSettings: "Definições",
  toolbarBack: "Voltar",
  tabHome: "Início",
  tabExplore: "Explorar",
  tabProfile: "Perfil",
};

const nav_es = {
  menuOpen: "Abrir menú de cuenta",
  menuClose: "Cerrar menú",
  menuProfile: "Perfil",
  menuSettings: "Ajustes",
  toolbarBack: "Atrás",
  tabHome: "Inicio",
  tabExplore: "Explorar",
  tabProfile: "Perfil",
};

const nav_fr = {
  menuOpen: "Ouvrir le menu du compte",
  menuClose: "Fermer le menu",
  menuProfile: "Profil",
  menuSettings: "Paramètres",
  toolbarBack: "Retour",
  tabHome: "Accueil",
  tabExplore: "Explorer",
  tabProfile: "Profil",
};

const nav_de = {
  menuOpen: "Kontomenü öffnen",
  menuClose: "Menü schließen",
  menuProfile: "Profil",
  menuSettings: "Einstellungen",
  toolbarBack: "Zurück",
  tabHome: "Start",
  tabExplore: "Entdecken",
  tabProfile: "Profil",
};

const nav_it = {
  menuOpen: "Apri il menu account",
  menuClose: "Chiudi menu",
  menuProfile: "Profilo",
  menuSettings: "Impostazioni",
  toolbarBack: "Indietro",
  tabHome: "Home",
  tabExplore: "Esplora",
  tabProfile: "Profilo",
};

const nav_nl = {
  menuOpen: "Accountmenu openen",
  menuClose: "Menu sluiten",
  menuProfile: "Profiel",
  menuSettings: "Instellingen",
  toolbarBack: "Terug",
  tabHome: "Home",
  tabExplore: "Ontdekken",
  tabProfile: "Profiel",
};

export const NAV_STRINGS = {
  en: nav_en,
  "pt-BR": nav_ptBR,
  "pt-PT": nav_ptPT,
  es: nav_es,
  fr: nav_fr,
  de: nav_de,
  it: nav_it,
  nl: nav_nl,
};

export const NAV_STRING_KEYS = Object.keys(nav_en);

/** Canonical catalogue, keyed by the locale tags both apps ship. */
export const AUTH_STRINGS = { en, "pt-BR": ptBR, "pt-PT": ptPT, es, fr, de, it, nl };

export const AUTH_STRING_KEYS = Object.keys(en);

/** `signInTitle` + `auth` -> `auth_sign_in_title` */
function toMobileKey(namespace, key) {
  return `${namespace}_${key.replace(/([A-Z])/g, "_$1").toLowerCase()}`;
}

/** Nested next-intl namespace for a web locale. */
export function webAuthMessages(locale) {
  return AUTH_STRINGS[locale] ?? AUTH_STRINGS.en;
}

export function webNavMessages(locale) {
  return NAV_STRINGS[locale] ?? NAV_STRINGS.en;
}

/** Flat, prefixed bundle for a mobile locale. */
function flatten(catalogue, namespace, locale) {
  const source = catalogue[locale] ?? catalogue.en;
  return Object.fromEntries(
    Object.entries(source).map(([k, v]) => [toMobileKey(namespace, k), v]),
  );
}

export function mobileAuthStrings(locale) {
  return flatten(AUTH_STRINGS, "auth", locale);
}

export function mobileNavStrings(locale) {
  return flatten(NAV_STRINGS, "nav", locale);
}

/** Every flat key a mobile bundle gains, across both namespaces. */
export function mobileStringsFor(locale) {
  return { ...mobileAuthStrings(locale), ...mobileNavStrings(locale) };
}
