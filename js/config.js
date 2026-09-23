// Sportart-Erkennung und alle sportartspezifischen Daten.
// Hier gehoeren Athleten, Squads und Trick-Nomenklatur hin - kein Verhalten.
// ═══════════════ SPORT CONFIG (sportartspezifische Daten) ═══════════════
const SPORT = new URLSearchParams(location.search).get('sport') === 'snowboard' ? 'snowboard'
  : new URLSearchParams(location.search).get('sport') === 'freeski' ? 'freeski'
  : location.hostname.includes('snowboard') ? 'snowboard' : 'freeski';

// ═══════════════ PWA (Manifest & Icons — «Zum Home-Bildschirm» via Teilen-Menü) ═══════════════
(function initPWA(){
  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = `manifest-${SPORT}.webmanifest`;
  document.head.appendChild(manifest);
  const touchIcon = document.createElement('link');
  touchIcon.rel = 'apple-touch-icon';
  touchIcon.href = `icons/apple-touch-icon-${SPORT}.png`;
  document.head.appendChild(touchIcon);
  const appTitle = document.createElement('meta');
  appTitle.name = 'apple-mobile-web-app-title';
  appTitle.content = SPORT === 'snowboard' ? 'Snowboard' : 'Freeski';
  document.head.appendChild(appTitle);
})();
const SPORT_CONFIGS = {
  snowboard: {
    title: 'Trick Analyses Snowboard',
    supabaseUrl: 'https://oevjddfliqhtfvutllyf.supabase.co',
    supabaseKey: 'sb_publishable_38nueBUPcuSqwqK8QMI3VQ_rzohaNmh',
    sessionKey: 'sb_session',
    athletes: [
  {name:'Berenice Wicki',squad:'M'},
  {name:'David Hablützel',squad:'M'},
  {name:'Isabelle Lötscher',squad:'M'},
  {name:'Leonardo Saraiva',squad:'M'},
  {name:'Lura Wick',squad:'M'},
  {name:'Mischa Zürcher',squad:'M'},
  {name:'Soha Janett',squad:'M'},
  {name:'Alex Lotorto',squad:'PE'},
  {name:'Andrina Salis',squad:'PE'},
  {name:'Ariane Burri',squad:'PE'},
  {name:'Aron Wagner',squad:'PE'},
  {name:'Elias Lehner',squad:'PE'},
  {name:'Nicolas Schütz',squad:'PE'},
  {name:'Reef Hasler',squad:'PE'},
  {name:'Yuna Scheidegger',squad:'PE'},
  {name:'Emil Hoppe',squad:'DVLP'},
  {name:'Finn Ledergerber',squad:'DVLP'},
  {name:'Gian Casparis',squad:'DVLP'},
  {name:'Lina Kälin',squad:'DVLP'},
  {name:'Lou Limacher',squad:'DVLP'},
  {name:'Norin Keller',squad:'DVLP'},
  {name:'Robin Zürcher',squad:'DVLP'},
],
    squads: [
  {key:'M',  label:'TG HP Matty',         short:'TG HP',   color:'#39c3d4'},
  {key:'PE', label:'TG SS&BA Pascal & Emil', short:'TG 1 & 2', color:'#f59e0b'},
  {key:'DVLP', label:'TG DVLP Wendelin', short:'TG DVLP', color:'#34d399'},
],
    athleteOptgroups: `<optgroup label="TG HP Matty">
                          <option>Berenice Wicki</option>
            <option>David Hablützel</option>
            <option>Isabelle Lötscher</option>
            <option>Leonardo Saraiva</option>
            <option>Lura Wick</option>
            <option>Mischa Zürcher</option>
            <option>Soha Janett</option>
          </optgroup>
          <optgroup label="TG SS&BA Pascal & Emil">
                          <option>Alex Lotorto</option>
            <option>Andrina Salis</option>
            <option>Ariane Burri</option>
            <option>Aron Wagner</option>
            <option>Elias Lehner</option>
            <option>Nicolas Schütz</option>
            <option>Reef Hasler</option>
            <option>Yuna Scheidegger</option>
          </optgroup>
          <optgroup label="TG DVLP Wendelin">
                          <option>Emil Hoppe</option>
            <option>Finn Ledergerber</option>
            <option>Gian Casparis</option>
            <option>Lina Kälin</option>
            <option>Lou Limacher</option>
            <option>Norin Keller</option>
            <option>Robin Zürcher</option>
          </optgroup>
          `,
    // Vorschlaege fuer Rail-Tricks in der Live-Session
    railSuggestions: ['50-50','Switch 50-50','Nose Press','Tail Press','Front Board','Back Board','Front Nose Slide','Back Nose Slide','Front Lip','Back Lip','Front Tail Slide','Back Tail Slide','Front Blunt','Back Blunt','Front Nose Blunt','Back Nose Blunt','Front 270 on','Back 270 on','Hardway 270 on','270 out','450 out','Pretzel 270 out','270 to fakie'],
    selectFill: {
      'sb-disziplin': `
          <option value="">— select —</option>
          <option>Jump</option><option>Side Hit</option><option>Rail</option><option>Halfpipe</option>
        `,
      'edit-disziplin': `
          <option value="">— select —</option><option>Jump</option><option>Side Hit</option><option>Rail</option><option>Halfpipe</option>
        `,
      'edit-drehrichtung': `
          <option value="">–</option><option>Frontside</option><option>Backside</option><option>Switch Frontside</option><option>Switch Backside</option><option>Cab</option>
        `,
      'edit-flips': `
          <option value="">–</option><option value="">–</option><option>Single</option><option>Double</option><option>Triple</option><option>Quad</option>
        `,
      'edit-achse': `
          <option value="">–</option><option>Cork</option><option>Crippler</option><option>McTwist</option><option>Todeo</option><option>Rodeo</option><option>Infinity Axis</option><option>Upright Spins</option><option>Backroll</option><option>Frontroll</option><option>Underflip</option><option>Wildcat</option><option>Tamedog</option>
        `,
      'edit-grab': `
          <option value="">–</option><option>Bloody Dracula</option><option>Canadian Bacon</option><option>Chicken Salad</option><option>Cookie Monster</option><option>Crail</option><option>Crooked Cop</option><option>Cross Rocket</option><option>Double Tail</option><option>Dracula Method</option><option>Drunk Driver</option><option>Freshfish</option><option>Frontside</option><option>Indy</option><option>Japan</option><option>Lien</option><option>Melon</option><option>Method</option><option>Nose</option><option>Nuclear</option><option>Nuclear Method</option><option>Reach Around</option><option>Roast Beef</option><option>Rocket Air</option><option>Rusty Trombone</option><option>Sad Air</option><option>Seat Belt</option><option>Slob</option><option>Spaghetti</option><option>Stalefish</option><option>Stelmasky</option><option>Stink Bug</option><option>Suitcase</option><option>Swiss Cheese</option><option>Tai Pan</option><option>Tail</option><option>Truck Driver</option><option>Tuck Knee</option><option>Weddle (Mute)</option>
        `,
      'edit-absprung': `
          <option value="">–</option><option>N'Ollie</option><option>Nosebutter</option><option>Noseslide</option><option>Tailbutter</option><option>Tailslide</option><option>Hardway</option>
        `,
      'edit-style': `
          <option value="">–</option><option>Frontfoot Bone</option><option>Backfoot Bone</option>
        `,
      'edit-railart': `
          <option value="">–</option><option>0-50</option><option>Boardslide</option><option>Lipslide</option><option>Bluntslide</option><option>Nosepress</option><option>Tailpress</option><option>Noseslide</option><option>Tailslide</option>
        `,
      'sb-drehrichtung': `<option value="">–</option>
            <option>Frontside</option><option>Backside</option><option>Switch Frontside</option><option>Switch Backside</option>
          `,
      'sb-flips': `<option value="">–</option>
            <option value="">–</option><option>Single</option><option>Double</option><option>Triple</option><option>Quad</option>
          `,
      'sb-achse': `<option value="">–</option>
            <optgroup label="Off-Axis">
              <option>Cork</option><option>Crippler</option><option>McTwist</option><option>Todeo</option><option>Rodeo</option><option>Infinity Axis</option><option>Underflip</option>
            </optgroup>
            <optgroup label="Upright Spins (Longitudinal Axis)">
              <option>Upright Spins</option>
            </optgroup>
            <optgroup label="Classic Acrobatic Axis (Transverse Axis and Sagittal Axis)">
              <option>Backroll</option><option>Frontroll</option><option>Wildcat</option><option>Tamedog</option>
            </optgroup>
          `,
      'sb-absprung': `<option value="">–</option>
            <option>N'Ollie</option><option>Nosebutter</option><option>Noseslide</option><option>Tailbutter</option><option>Tailslide</option><option>Hardway</option>
          `,
      'sb-style': `<option value="">–</option><option>Frontfoot Bone</option><option>Backfoot Bone</option><option>Shifty</option><option>Double Shifty</option><option>Tweak</option>
          `,
      'sb-slideform': `<option value="">–</option>
            <option>50-50</option><option>Nose Press</option><option>Tail Press</option>
            <option>Board Slide</option><option>Nose Slide</option><option>Lip Slide</option>
            <option>Tail Slide</option><option>Blunt Slide</option><option>Nose Blunt</option>
          `,
      'sb-slidevar': `<option value="">–</option>
            <option>Frontside</option><option>Backside</option><option>Switch Frontside</option><option>Switch Backside</option>
          `,
      'sb-inspin': `<option value="">–</option>
            <option>FS 270</option><option>BS 270</option><option>Switch FS 270</option><option>Switch BS 270</option>
            <option>FS Hardway 270</option><option>BS Hardway 270</option><option>Switch FS Hardway 270</option><option>Switch BS Hardway 270</option>
            <option>FS 450</option><option>BS 450</option><option>Switch FS 450</option><option>Switch BS 450</option>
            <option>FS Hardway 450</option><option>BS Hardway 450</option><option>Switch FS Hardway 450</option><option>Switch BS Hardway 450</option>
          `,
      'sb-swap-label': `Combo`,
      'sb-slidevar-label': `Direction`,
      'sb-swap': `<option value="">–</option>
            <option value="__add__">＋ Add new…</option>
          `,
      'sb-outspin': `<option value="">–</option>
            <option>FS 270 out</option><option>BS 270 out</option><option>Switch FS 270 out</option><option>Switch BS 270 out</option>
            <option>FS 450 out</option><option>BS 450 out</option><option>Switch FS 450 out</option><option>Switch BS 450 out</option>
            <option>FS 630 out</option><option>BS 630 out</option><option>Switch FS 630 out</option><option>Switch BS 630 out</option>
            <option>FS 810 out</option><option>BS 810 out</option><option>Switch FS 810 out</option><option>Switch BS 810 out</option>
            <option>Pretzel 270 out</option><option>Pretzel 450 out</option><option>to Fakie</option><option>to Forward</option>
          `,
      'sbe-slideform': `<option value="">–</option>
          <option>50-50</option><option>Nose Press</option><option>Tail Press</option><option>Board Slide</option><option>Nose Slide</option><option>Lip Slide</option><option>Tail Slide</option><option>Blunt Slide</option><option>Nose Blunt</option>
        `,
      'sbe-inspin': `<option value="">–</option>
          <option>FS 270</option><option>BS 270</option><option>Switch FS 270</option><option>Switch BS 270</option>
          <option>FS Hardway 270</option><option>BS Hardway 270</option><option>Switch FS Hardway 270</option><option>Switch BS Hardway 270</option>
          <option>FS 450</option><option>BS 450</option><option>Switch FS 450</option><option>Switch BS 450</option>
          <option>FS Hardway 450</option><option>BS Hardway 450</option><option>Switch FS Hardway 450</option><option>Switch BS Hardway 450</option>
        `,
      'sbe-outspin': `<option value="">–</option>
          <option>FS 270 out</option><option>BS 270 out</option><option>Switch FS 270 out</option><option>Switch BS 270 out</option>
          <option>FS 450 out</option><option>BS 450 out</option><option>Switch FS 450 out</option><option>Switch BS 450 out</option>
          <option>FS 630 out</option><option>BS 630 out</option><option>Switch FS 630 out</option><option>Switch BS 630 out</option>
          <option>FS 810 out</option><option>BS 810 out</option><option>Switch FS 810 out</option><option>Switch BS 810 out</option>
          <option>Pretzel 270 out</option><option>Pretzel 450 out</option><option>to Fakie</option><option>to Forward</option>
        `,
      'sbe-disziplin': `<option value="">–</option>
          <option>Jump</option><option>Side Hit</option><option>Rail</option><option>Halfpipe</option>
        `,
      'sbe-drehrichtung': `<option value="">–</option>
          <option>Frontside</option><option>Backside</option><option>Switch Frontside</option><option>Switch Backside</option><option>Cab</option>
        `,
      'sbe-achse': `<option value="">–</option>
          <option>Cork</option><option>Crippler</option><option>Bio/Misty</option><option>Flat</option><option>Rodeo</option>
          <option>Upright Spins</option><option>Backroll</option><option>Frontroll</option><option>Underflip</option><option>Wildcat</option><option>Tamedog</option>
        `,
      'sbe-style': `<option value="">–</option>
          <option>Frontfoot Bone</option><option>Backfoot Bone</option>
        `,
      'sbe-absprung': `<option value="">–</option>
          <option>N'Ollie</option><option>Nosebutter</option><option>Noseslide</option><option>Tailbutter</option><option>Tailslide</option><option>Hardway</option>
        `,
      'sbe-bringback': `<option value="">–</option>
          <option>Weddle (Mute)</option><option>Stalefish</option><option>Melon</option>
        `,
    },
  },
  freeski: {
    title: 'Trick Analyses Freeski',
    supabaseUrl: 'https://nvibrxtqknkmsiccauzs.supabase.co',
    supabaseKey: 'sb_publishable_8RRRG5c_PhJ8Cc1rC03zJw_1W5UYkS7',
    sessionKey: 'fs_session',
    athletes: [
  {name:'Adrien Vaudaux',squad:'GK'},
  {name:'Andri Ragettli',squad:'GK'},
  {name:'Fadri Rhyner',squad:'GK'},
  {name:'Gian Andri Bolinger',squad:'GK'},
  {name:'Giulia Tanno',squad:'GK'},
  {name:'Kim Gubser',squad:'GK'},
  {name:'Mathilde Gremaud',squad:'GK'},
  {name:'Nicola Bolinger',squad:'GK'},
  {name:'Nils Rhyner',squad:'GK'},
  {name:'Sarah Höfflin',squad:'GK'},
  {name:'Viktor Maksyagin',squad:'GK'},
  {name:'Anouk Andraska',squad:'X'},
  {name:'Jason Zacharopoulos',squad:'X'},
  {name:'Lars Ruchti',squad:'X'},
  {name:'Lou Annen',squad:'X'},
  {name:'Maxence Petzoldt',squad:'X'},
  {name:'Tim Egger',squad:'X'},
  {name:'Alan Bornet',squad:'HP'},
  {name:'Alani Klebeck',squad:'DVLP'},
  {name:'Carmen Savioz',squad:'DVLP'},
  {name:'Elia Grauwiler',squad:'DVLP'},
  {name:'Enak Picot',squad:'DVLP'},
  {name:'Jakub Sklenar',squad:'DVLP'},
  {name:'Kiana Klebeck',squad:'DVLP'},
  {name:'Nando Demke',squad:'DVLP'},
  {name:'Neo Zingg',squad:'DVLP'},
],
    squads: [
  {key:'GK', label:'TG SS&BA Greg & Kai', short:'TG 1', color:'#39c3d4'},
  {key:'X',  label:'TG SS&BA Xeno',       short:'TG 2', color:'#f59e0b'},
  {key:'HP', label:'TG Halfpipe',   short:'TG HP',   color:'#a78bfa'},
  {key:'DVLP', label:'TG DVLP Dominic', short:'TG DVLP', color:'#34d399'},
],
    athleteOptgroups: `<optgroup label="TG SS&BA Greg & Kai">
            <option>Adrien Vaudaux</option>
            <option>Andri Ragettli</option>
            <option>Fadri Rhyner</option>
            <option>Gian Andri Bolinger</option>
            <option>Giulia Tanno</option>
            <option>Kim Gubser</option>
            <option>Mathilde Gremaud</option>
            <option>Nicola Bolinger</option>
            <option>Nils Rhyner</option>
            <option>Sarah Höfflin</option>
            <option>Viktor Maksyagin</option>
          </optgroup>
          <optgroup label="TG SS&BA Xeno">
                          <option>Anouk Andraska</option>
            <option>Jason Zacharopoulos</option>
            <option>Lars Ruchti</option>
            <option>Lou Annen</option>
            <option>Maxence Petzoldt</option>
            <option>Tim Egger</option>
          </optgroup>
          <optgroup label="TG Halfpipe">
                          <option>Alan Bornet</option>
          </optgroup>
          <optgroup label="TG DVLP Dominic">
                          <option>Alani Klebeck</option>
            <option>Carmen Savioz</option>
            <option>Elia Grauwiler</option>
            <option>Enak Picot</option>
            <option>Jakub Sklenar</option>
            <option>Kiana Klebeck</option>
            <option>Nando Demke</option>
            <option>Neo Zingg</option>
          </optgroup>
          `,
    // Vorschlaege fuer Rail-Tricks in der Live-Session
    railSuggestions: ['50-50','Switch 50-50','Slide','Front Slide','Back Slide','Lip On','Switch Lip On','Switch Tails On','Front Swap','Back Swap','FS 360 Swap','BS 360 Swap'],
    selectFill: {
      'edit-disziplin': `
          <option value="">— select —</option><option>Jump</option><option>Rail</option><option>Halfpipe</option><option>Landing Bag</option>
        `,
      'edit-drehrichtung': `
          <option value="">–</option><option>Right</option><option>Left</option><option>Switch Left</option><option>Switch Right</option>
        `,
      'edit-flips': `
          <option value="">–</option><option>None</option><option>Single</option><option>Double</option><option>Triple</option><option>Quad</option>
        `,
      'edit-achse': `
          <option value="">–</option><option>Cork</option><option>Bio/Misty</option><option>Flat Spins</option><option>Rodeo</option><option>Upright Spins</option><option>Frontflip</option><option>Backflip</option><option>Sideflip</option>
        `,
      'edit-grab': `
          <option value="">–</option><option>Blunt</option><option>Bow and Arrow</option><option>Broken Arrow</option><option>Critical</option><option>Cuban</option><option>Double Japan</option><option>Esco</option><option>Guitar</option><option>High Mute</option><option>In and out</option><option>Indi-Truck</option><option>Inside Tail</option><option>Japan</option><option>Mute</option><option>Nose</option><option>Octo</option><option>Rocket</option><option>Safety</option><option>Screamin' Seamen</option><option>Seatbelt</option><option>Seatbelt Japan</option><option>Stale</option><option>Stink Bug</option><option>Tail</option><option>Truckdriver</option><option>Venom</option>
        `,
      'edit-absprung': `
          <option value="">–</option><option>Blender</option><option>Carved</option><option>Hand-Drag</option><option>Inside Edge</option><option>Nosebutter</option><option>Tailbutter</option>
        `,
      'edit-style': `
          <option value="">–</option><option>Tweak/Bone</option><option>Poke</option>
        `,
      'edit-railart': `
          <option value="">–</option><option>Box</option><option>Tube</option><option>Rail</option><option>Down Tube</option><option>Down Rail</option><option>Single Kink</option><option>Double Kink</option><option>Cannon</option><option>Gap to Rail</option><option>DFD</option><option>Flat-Down</option><option>Waterfall</option><option>Ellbow</option><option>S-Rail</option><option>C-Rail</option><option>Pole-Jam</option>
        `,
      'sb-drehrichtung': `<option value="">–</option>
            <option>Right</option><option>Left</option><option>Switch Left</option><option>Switch Right</option>
          `,
      'sb-flips': `<option value="">–</option>
            <option>None</option><option>Single</option><option>Double</option><option>Triple</option><option>Quad</option>
          `,
      'sb-achse': `<option value="">–</option>
            <optgroup label="Off-Axis">
              <option>Cork</option><option>Bio/Misty</option><option>Flat Spins</option><option>Rodeo</option>
            </optgroup>
            <optgroup label="Upright Spins (Longitudinal Axis)">
              <option>Upright Spins</option>
            </optgroup>
            <optgroup label="Classic Acrobatic Axis (Transverse Axis and Sagittal Axis)">
              <option>Frontflip</option><option>Backflip</option><option>Sideflip</option>
            </optgroup>
          `,
      'sb-absprung': `<option value="">–</option>
            <option>Blender</option><option>Carved</option><option>Hand-Drag</option><option>Inside Edge</option><option>Nosebutter</option><option>Tailbutter</option>
          `,
      'sb-style': `<option value="">–</option><option>Tweak/Bone</option><option>Poke</option>`,
      'sbe-disziplin': `<option value="">–</option>
          <option>Jump</option><option>Rail</option><option>Halfpipe</option><option>Landing Bag</option>
        `,
      'sbe-drehrichtung': `<option value="">–</option>
          <option>Right</option><option>Left</option><option>Switch Left</option><option>Switch Right</option>
        `,
      'sbe-achse': `<option value="">–</option>
          <option>Cork</option><option>Bio/Misty</option><option>Flat Spins</option><option>Rodeo</option>
          <option>Upright Spins</option><option>Frontflip</option><option>Backflip</option><option>Sideflip</option>
        `,
      'sbe-style': `<option value="">–</option>
          <option value="">–</option><option>Tweak/Bone</option><option>Poke</option>
        `,
      'sbe-absprung': `<option value="">–</option>
          <option>Blender</option><option>Carved</option><option>Hand-Drag</option><option>Inside Edge</option><option>Nosebutter</option><option>Tailbutter</option>
        `,
      'sbe-bringback': `<option value="">–</option>
          <option>180</option><option>360</option><option>540</option>
        `,
    },
  },
};
const CFG = SPORT_CONFIGS[SPORT];
// Snowboard uses the refreshed mint green; Freeski keeps the classic palette
const UI_GREEN      = '#34d399';  // seit 31.8.2026 beide Sportarten Mint
const UI_GREEN_TEXT = SPORT === 'snowboard' ? '#34d399' : '#4ade80';
const UI_GREEN_BG25 = SPORT === 'snowboard' ? 'rgba(52,211,153,0.25)' : 'rgba(52,211,153,0.25)';
const UI_GREEN_BG20 = SPORT === 'snowboard' ? 'rgba(52,211,153,0.2)'  : 'rgba(52,211,153,0.2)';
