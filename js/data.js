/* ==========================================================
   PROJECTS — edit this list to add / change your projects.
   ----------------------------------------------------------
   title     : project name
   desc      : 1–2 sentence description
   tags      : tech used (shown as small chips)
   category  : any of "laravel", "professional", "frontend" (used by the filter buttons)
   badge     : small label on the image
   image     : path to a screenshot, e.g. "assets/projects/blood-bank.jpg"
               leave "" to show the generated placeholder art
   icon      : Bootstrap Icon name for the placeholder (https://icons.getbootstrap.com)
   colors    : two colors for the placeholder gradient
   live      : live site URL ("" = hidden)
   liveLabel : text for the live link (optional, default "Live site")
   github    : GitHub repo URL ("" = hidden)
   note      : text shown when there is no live or GitHub link
   ========================================================== */
window.PROJECTS = [
  {
    title: "Blood Bank Website",
    desc: "A responsive, scalable blood bank platform with AI-powered donor search, manual blood search and an OpenAI chatbot. Includes donor registration, blood requests, donation management and secure database integration.",
    tags: ["Laravel", "PHP", "MySQL", "OpenAI API", "AI search"],
    category: ["laravel"],
    badge: "Full Stack · AI",
    image: "",
    icon: "droplet-half",
    colors: ["#ff3d5a", "#4a0d18"],
    live: "",
    github: "",
    note: "Demo available on request"
  },
  {
    title: "Shan E-commerce",
    desc: "Worked on the e-commerce web application for SHAN, a Bangladeshi leather goods and footwear brand — built for easy product browsing, customer interaction and seamless online purchasing.",
    tags: ["E-commerce", "Web application", "Team project"],
    category: ["professional"],
    badge: "Professional",
    image: "",
    icon: "bag-check",
    colors: ["#c98a4b", "#3a220e"],
    live: "https://shan.com.bd",
    liveLabel: "shan.com.bd",
    github: ""
  },
  {
    title: "LPI Library",
    desc: "A library management system for students and teachers — student portal plus an admin console for books, categories, borrowing, fines, announcements, notifications and support chat.",
    tags: ["Laravel 12", "PHP 8.2", "MySQL", "Blade"],
    category: ["laravel"],
    badge: "Full Stack",
    image: "",
    icon: "book-half",
    colors: ["#7c5cff", "#1f1650"],
    live: "",
    github: "",
    note: "Demo available on request"
  },
  {
    title: "3D Developer Portfolio",
    desc: "This website — an interactive 3D portfolio with a robot head that follows your cursor, a draggable skills sphere and scroll animations. Hosted on GitHub Pages.",
    tags: ["Three.js", "GSAP", "Bootstrap", "JavaScript"],
    category: ["frontend"],
    badge: "Front-end · 3D",
    image: "assets/projects/portfolio.jpg",
    icon: "badge-3d",
    colors: ["#c6ff3d", "#2d3b0b"],
    live: "https://thunder5316r.github.io/portfolio.am/",
    liveLabel: "Live site",
    github: "https://github.com/Thunder5316R/portfolio.am"
  }
];
