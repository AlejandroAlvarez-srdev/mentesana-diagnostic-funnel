// Catálogo FIJO de psicólogas del /test-diagnostico (fallback del match).
//
// El match real sale de /api/diagnostico/match-pool (Amelia, status='visible' y con
// vídeo). Esta lista solo se usa mientras ese fetch está en vuelo o si falla, y
// /api/test-diagnostico/pool la filtra por las visibles en Amelia.
//
// Vive en un módulo SIN "use client" a propósito: DiagnosticoMatching.tsx es un
// componente cliente y, en Next 16, importar un export suyo desde un route handler
// devuelve una referencia de cliente (proxy), no el array → `PSYCHOLOGISTS.filter is
// not a function` y el filtro por visibles llevaba roto desde agosto 2026.
//
// Si una psicóloga deja Mente Sana o pasa a hidden en Amelia, hay que QUITARLA de
// aquí también: el filtro por visibles no cubre el caso de Amelia caída (devuelve la
// lista entera) ni el primer render. Tatiana Castro salió el 22-oct-2026 por eso.
export type PsychologistEntry = {
  name: string;
  city: string;
  exp: string;
  specialty: string;
  video: string;
  profiles: string[];
};

export const PSYCHOLOGISTS: PsychologistEntry[] = [
  // Ansiedad
  { name: "Adriana Salas", city: "Madrid", exp: "10 años", specialty: "Ansiedad, pánico, TCC", video: "/videos/welcome/adriana-salas.mp4", profiles: ["ansiedad", "estres"] },
  { name: "Carolina Prudencio", city: "Madrid", exp: "9 años", specialty: "Ansiedad generalizada, mindfulness", video: "/videos/welcome/carolina-prudencio.mp4", profiles: ["ansiedad", "otro"] },
  { name: "María Infante", city: "Valencia", exp: "8 años", specialty: "Ansiedad social, fobias, TCC", video: "/videos/welcome/maria-infante.mp4", profiles: ["ansiedad", "relaciones"] },
  // Depresión
  { name: "Diana Salazar", city: "Madrid", exp: "11 años", specialty: "Depresión, insomnio, duelo", video: "/videos/welcome/diana-salazar-alzate.mp4", profiles: ["depresion", "otro"] },
  { name: "Brenda Castillo", city: "Barcelona", exp: "10 años", specialty: "Depresión, terapia sistémica", video: "/videos/welcome/brenda-castillo.mp4", profiles: ["depresion", "relaciones"] },
  { name: "Melanie Camejo", city: "Sevilla", exp: "8 años", specialty: "Depresión, duelo, autoestima", video: "/videos/welcome/melanie-camejo.mp4", profiles: ["depresion", "crecimiento"] },
  { name: "Rosana Juárez", city: "Madrid", exp: "12 años", specialty: "Depresión, terapia integrativa", video: "/videos/welcome/rosana-juarez.mp4", profiles: ["depresion", "otro"] },
  // Relaciones
  { name: "Gabriela Delgado", city: "Valencia", exp: "8 años", specialty: "Relaciones, autoestima, fobias", video: "/videos/welcome/gabriela-delgado.mp4", profiles: ["relaciones", "crecimiento"] },
  { name: "Mónica Guiza", city: "Madrid", exp: "10 años", specialty: "Relaciones, apego, familia", video: "/videos/welcome/monica-guiza.mp4", profiles: ["relaciones", "crecimiento"] },
  { name: "Laura Acosta", city: "Málaga", exp: "7 años", specialty: "Relaciones, dependencia emocional", video: "/videos/welcome/laura-acosta-acosta.mp4", profiles: ["relaciones", "otro"] },
  // Estrés / burnout
  { name: "Alexandra Elías", city: "Barcelona", exp: "9 años", specialty: "Burnout, EMDR, estrés laboral", video: "/videos/welcome/alexandra-elias.mp4", profiles: ["estres", "crecimiento"] },
  { name: "Greslimar Padilla", city: "Madrid", exp: "8 años", specialty: "Estrés laboral, mindfulness", video: "/videos/welcome/greslimar-padilla.mp4", profiles: ["estres", "ansiedad"] },
  { name: "Antonella Matinella", city: "Bilbao", exp: "10 años", specialty: "Burnout, sueño, regulación emocional", video: "/videos/welcome/antonella-matinella.mp4", profiles: ["estres", "otro"] },
  // Crecimiento / otros
  { name: "Selene Oropeza", city: "Madrid", exp: "9 años", specialty: "Crecimiento personal, autoconocimiento", video: "/videos/welcome/selene-oropeza.mp4", profiles: ["crecimiento", "otro"] },
  { name: "Juliana Urioste", city: "Valencia", exp: "7 años", specialty: "Crecimiento, decisiones vitales", video: "/videos/welcome/juliana-urioste.mp4", profiles: ["crecimiento", "relaciones"] },
  { name: "Yohaira Espinoza", city: "Zaragoza", exp: "11 años", specialty: "Terapia integrativa, psicoanálisis", video: "/videos/welcome/yohaira-espinoza.mp4", profiles: ["otro", "crecimiento"] },
  { name: "Mallerly Mesa", city: "Barcelona", exp: "8 años", specialty: "Autoestima, identidad, duelo", video: "/videos/welcome/mallerly-mesa.mp4", profiles: ["crecimiento", "depresion"] },
];
