export interface LegalSection { title: string; paras?: string[]; list?: string[]; after?: string[] }
export interface LegalDocument { slug: string; title: string; summary: string; updated: string; sections: LegalSection[] }

const UPDATED = "12 October 2026";

export const TERMS: LegalDocument = {
  slug: "terms",
  title: "Terms of Service",
  summary: "The rules for using TypeNest, including accounts, content, competition and our responsibilities.",
  updated: UPDATED,
  sections: [
    { title: "Acceptance of these terms", paras: ["By creating an account or using TypeNest (the \"Service\"), you agree to these Terms of Service and to the Privacy Policy, Cookie Policy and Acceptable Use and Fair Play Policy, which form part of this agreement. If you do not agree, do not use the Service."] },
    { title: "Who may use the Service", paras: ["You must be old enough to form a binding contract where you live, or have the permission of a parent or legal guardian. The Service is not intended for children under 13, and you must not create an account if you are under 13.", "Parts of the Service, such as the typing test, can be tried without an account. Results from a guest session are stored in your browser and may be added to your account if you sign up."] },
    { title: "Your account", paras: ["You are responsible for the activity on your account and for keeping your sign-in details secure. Provide accurate information, keep one account per person, and tell us promptly if you believe your account has been accessed without permission. You may not sell, transfer or share your account."] },
    { title: "Your content", paras: ["Your content includes your username, bio, links, country, profile photo, team names, room and tournament names, and messages such as race emotes. You keep ownership of it.", "You give us a non-exclusive, worldwide, royalty-free licence to host, store, display and distribute your content as needed to operate the Service. For example, to show your profile, photo and statistics on your public profile, in leaderboards, in races you take part in, and to people who watch a race. This licence ends when you remove the content or your account, except for copies that are reasonably retained for a limited time, such as backups.", "You are responsible for your content and confirm that you have the right to share it and that it follows the Acceptable Use and Fair Play Policy."] },
    { title: "Competition, ratings and results", paras: ["Typing results, experience points, levels, achievements, ratings, rankings and leaderboard positions are features of the Service. They have no cash value and are not property you can transfer.", "We verify results using automated checks, including the timing of keystrokes in multiplayer races. We may correct, remove or reset results, ratings and rankings that we reasonably believe were obtained unfairly, through errors, or in breach of these Terms, and we may change how scores, ratings and rankings are calculated."] },
    { title: "Multiplayer, friends and teams", paras: ["Races, tournaments, friend requests, teams and spectating involve other people. Other participants can see your username and the results you produce in a shared race. A person with a race link can watch a race but cannot take part in it unless they join.", "We do not guarantee that a race will complete. Races can end early if a player disconnects, and the Service may close a race after a period of inactivity."] },
    { title: "Acceptable use", paras: ["You agree to follow the Acceptable Use and Fair Play Policy. In particular, you will not cheat, interfere with the Service, or use it to harass others or break the law."] },
    { title: "The Service and changes to it", paras: ["We work to keep the Service available and accurate, but it is provided as it is and may be interrupted, changed or discontinued. We may add, change or remove features, lessons, games and modes at any time. Where reasonable, we will try to give notice of significant changes."] },
    { title: "Third-party services", paras: ["The Service relies on third-party providers for hosting, authentication, database storage, file storage and analytics. Your use of the Service may involve those providers processing data on our behalf, as described in the Privacy Policy. We are not responsible for services we do not control."] },
    { title: "Suspension and termination", paras: ["You may stop using the Service at any time. We may suspend, restrict or end your access, remove content, or reset your results and ratings if you breach these Terms, if we must do so to protect the Service or other users, or if the law requires it."] },
    { title: "Disclaimers", paras: ["To the fullest extent permitted by law, the Service is provided \"as is\" and \"as available\", without warranties of any kind, whether express or implied, including fitness for a particular purpose, accuracy, and uninterrupted or error-free operation. Typing speed measurements are provided for practice and entertainment and are not a certified assessment."] },
    { title: "Limitation of liability", paras: ["To the fullest extent permitted by law, we are not liable for indirect, incidental, special, consequential or punitive damages, or for loss of data, profits, goodwill or opportunity arising from your use of the Service. Nothing in these Terms limits liability that cannot be limited by law."] },
    { title: "Changes to these terms", paras: ["We may update these Terms from time to time. The date at the top shows when they were last changed. If you keep using the Service after an update takes effect, you accept the updated Terms."] },
    { title: "General", paras: ["These Terms are the entire agreement between you and us about the Service. If a part of them is found to be unenforceable, the rest stays in effect. A failure to enforce a provision is not a waiver of it. These Terms are governed by the laws that apply where the Service is operated, and disputes will be handled by the courts that have jurisdiction there, unless the law gives you rights that cannot be waived."] }
  ]
};

export const PRIVACY: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  summary: "What information TypeNest collects, why, who can see it, and the choices you have.",
  updated: UPDATED,
  sections: [
    { title: "Overview", paras: ["This policy explains how TypeNest (\"we\", \"us\") handles personal information when you use the Service. We collect what we need to run accounts, record your progress, run races and leaderboards, and keep the Service secure and fair. We do not sell your personal information."] },
    { title: "Information we collect", paras: ["Information you give us:"], list: ["Account details: your email address and sign-in credentials, handled by our authentication provider. We do not see or store your password in readable form.", "Profile details you choose to add: username, bio, country, social links and a profile photo.", "Content you create: team names, room and tournament names, friend requests, and race emotes.", "API keys you create: we store a one-way hash of each key, its name and when it was last used, never the key itself."], after: ["Information created by your use of the Service:"] },
    { title: "Activity and performance data", list: ["Typing tests: speed, accuracy, consistency, duration, mode, language and settings, and per-character statistics used for coaching.", "Progress: experience points, levels, missions, achievements, streaks, lesson progress and arcade scores.", "Multiplayer: race and tournament participation, results, places, ratings, and the timing of your keystrokes during a race, which we use to verify that results are genuine.", "Social: friends and friend requests, team membership, and the races you create or join."] },
    { title: "Technical information", paras: ["Our hosting and analytics providers receive standard technical data when you visit, such as your IP address, device and browser type, pages viewed and approximate location. We use it to deliver the Service, measure usage, prevent abuse and fix problems. We also apply rate limits that use an identifier such as your account or IP address."] },
    { title: "How we use information", list: ["To provide the Service: sign you in, save and display your progress, run races, tournaments, teams and friends.", "To rank and compare: build leaderboards, ratings and public profiles.", "To keep the Service fair and safe: detect cheating, abuse and automated activity, and enforce our policies.", "To improve the Service: understand how features are used, find errors and plan changes.", "To meet legal obligations."] },
    { title: "What other people can see", paras: ["Some information is public by design. Your username, level, rating, rank, bio, country, social links, profile photo, achievements, test statistics and history of recent speed and accuracy can appear on your public profile and in leaderboards. Players in a race can see each other's usernames, progress and results, and people with a race link can watch it. Your email address is not shown on your profile.", "Profile photos are stored at a public web address. Anyone who has the address can view the image."] },
    { title: "Who we share information with", paras: ["We share information with service providers who process it on our behalf to host the Service, authenticate users, store data and files, and measure usage. They may only use it to provide those services. We may also disclose information if the law requires it, to protect people or the Service from harm, or as part of a business transfer. We do not sell personal information or share it for third-party advertising."] },
    { title: "Where information is processed", paras: ["Our providers may process and store information in countries other than your own. Where this happens, we rely on the safeguards our providers offer for transferring data."] },
    { title: "How long we keep information", paras: ["We keep your information while your account is active and for as long as we need it to run the Service, keep results and rankings accurate, prevent abuse and meet legal duties. Some information, such as backups and security logs, is kept for a limited period before it is removed."] },
    { title: "Security", paras: ["We use access controls, row-level database security, encrypted connections and automated abuse checks to protect information. No online service can be completely secure, so we cannot guarantee absolute security."] },
    { title: "Your choices", list: ["Edit or remove your bio, country, social links and profile photo from your profile.", "Remove friends, leave a team, or cancel friend requests at any time.", "Choose a colour theme and sound settings in Settings.", "Sign out at any time, and use your browser settings to control stored data and cookies, as explained in the Cookie Policy.", "Depending on where you live, you may have legal rights over your personal information, such as access, correction, deletion and objection. We will honour those rights as the law requires."] },
    { title: "Children", paras: ["The Service is not directed to children under 13 and we do not knowingly collect their personal information. If we learn that we have collected information from a child under 13, we will delete it."] },
    { title: "Changes to this policy", paras: ["We may update this policy as the Service changes. The date at the top shows the latest version. If a change is significant, we will take reasonable steps to let you know."] }
  ]
};

export const COOKIES: LegalDocument = {
  slug: "cookies",
  title: "Cookie Policy",
  summary: "The cookies and browser storage TypeNest uses, and how you can control them.",
  updated: UPDATED,
  sections: [
    { title: "What this policy covers", paras: ["Cookies are small files that a website stores in your browser. We also use similar browser storage, such as local storage. This policy explains what we use and why."] },
    { title: "Essential cookies", paras: ["These are needed for the Service to work and cannot be switched off in the Service:"], list: ["Sign-in session: our authentication provider sets cookies that keep you signed in and protect your session. Without them you cannot use signed-in features."] },
    { title: "Browser storage for your preferences and progress", list: ["Display and typing preferences, such as your theme and sound settings, may be saved in your browser so they are remembered on your next visit.", "Guest sessions: if you try the typing test without an account, results can be kept in your browser until you sign up, when they may be added to your account."] },
    { title: "Analytics", paras: ["We use Vercel Analytics to understand how the Service is used, such as which pages are visited. It is designed to measure traffic without using cookies to identify you across sites. It receives technical information about the visit, such as the page and your approximate location."] },
    { title: "What we do not do", list: ["We do not use advertising or tracking cookies.", "We do not sell data collected through cookies or browser storage."] },
    { title: "Managing cookies and storage", paras: ["Your browser lets you view, block and delete cookies and site data. If you block essential cookies, you will not be able to stay signed in. If you clear browser storage, your saved preferences and any guest results that have not been added to an account will be removed."] },
    { title: "Changes to this policy", paras: ["If we add new kinds of cookies or storage, we will update this page and the date above."] }
  ]
};

export const ACCEPTABLE_USE: LegalDocument = {
  slug: "acceptable-use",
  title: "Acceptable Use and Fair Play Policy",
  summary: "How to behave on TypeNest and what counts as cheating or misuse.",
  updated: UPDATED,
  sections: [
    { title: "Purpose", paras: ["TypeNest works only if results are real and people are treated with respect. This policy sets out what is and is not allowed. It applies to everything you do on the Service, including races, tournaments, teams, friends and public profiles."] },
    { title: "Play fairly", paras: ["Every score, rating and leaderboard position must come from you typing by hand on a keyboard. You must not:"], list: ["Use bots, scripts, macros, auto-typers, browser extensions or any tool that types or assists typing for you.", "Paste text, replay recorded input, or fake keystroke timing.", "Modify, automate or reverse engineer the client or send fabricated requests to the Service.", "Use more than one account to gain ratings, rankings, rewards or leaderboard places, or to manipulate matches, including deliberately losing to help another account.", "Collude with others to fix the result of a race or tournament.", "Exploit a bug or weakness to gain an advantage. If you find one, stop using it."] },
    { title: "Treat people with respect", paras: ["Usernames, bios, links, profile photos, team names, room and tournament names and emotes must not contain or promote:"], list: ["Harassment, threats, bullying or targeting of any person or group.", "Hate speech or discrimination based on race, ethnicity, nationality, religion, gender, sexual orientation, disability or similar characteristics.", "Sexually explicit, violent or otherwise harmful or disturbing material.", "Illegal activity, or content that infringes someone else's rights.", "Impersonation of another person, a team or the Service, or misleading information about who you are.", "Spam, advertising, scams or links to harmful sites."] },
    { title: "Protect the Service", paras: ["You must not:"], list: ["Attempt to gain access to accounts, data or systems that are not yours.", "Probe, scan or test the Service for weaknesses, or interfere with it, for example by overloading it or evading rate limits.", "Scrape or copy the Service's content or data at scale by automated means.", "Upload files that contain malware or are not an image you have the right to use as a profile photo."] },
    { title: "How we enforce this policy", paras: ["We use automated checks and review to find breaches. Depending on how serious or repeated a breach is, we may:"], list: ["Remove or hide content, or change a username.", "Reject, remove or reset results, experience, ratings or rankings.", "Remove an account from leaderboards, races, tournaments or teams.", "Suspend or permanently close an account.", "Report unlawful activity to the appropriate authorities."], after: ["We may act without notice where it is necessary to protect the Service or other people. These actions do not limit any other rights we have under the Terms of Service."] },
    { title: "Changes to this policy", paras: ["We may update this policy as the Service grows and new ways of misusing it appear. The date at the top shows the latest version."] }
  ]
};

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/acceptable-use", label: "Acceptable use" }
];
