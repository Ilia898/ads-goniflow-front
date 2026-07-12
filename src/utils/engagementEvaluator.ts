export interface EngagementReport {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  colorClass: string;
  tips: string[];
}

/**
 * Analyzes the post content and returns an engagement score (0-100),
 * grade (A-F), and optimization tips based on the selected platform.
 */
export function evaluateEngagement(text: string, platform: string, selectedCta?: string): EngagementReport {
  const clean = text.trim();
  if (!clean) {
    return {
      score: 0,
      grade: "F",
      colorClass: "text-slate-500 border-slate-500/20 bg-slate-500/10",
      tips: ["შეიყვანეთ პოსტის ტექსტი მის გასაანალიზებლად."],
    };
  }

  let score = 30; // Base score
  const tips: string[] = [];

  // 1. Text Length / Readability check
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  const charCount = clean.length;

  if (platform === "x") {
    if (charCount > 280) {
      score -= 20;
      tips.push("⚠️ X (Twitter)-ისთვის ტექსტი ძალიან გრძელია (მაქს. 280 სიმბოლო). შეამოკლეთ იგი.");
    } else if (charCount > 80 && charCount <= 220) {
      score += 20;
      tips.push("✅ პოსტის სიგრძე იდეალურია X-ისთვის (80-220 სიმბოლო).");
    } else {
      score += 5;
    }
  } else if (platform === "instagram") {
    if (wordCount < 8) {
      score -= 10;
      tips.push("⚠️ Instagram-ის პოსტი ზედმეტად მოკლეა. დაამატეთ მეტი აღწერა.");
    } else if (wordCount > 20 && wordCount < 60) {
      score += 15;
      tips.push("✅ სიგრძე ოპტიმალურია Instagram-ისთვის.");
    } else {
      score += 5;
    }
  } else {
    // Facebook, LinkedIn
    if (wordCount > 120) {
      tips.push("💡 ტექსტი საკმაოდ გრძელია. გაყავით აბზაცებად უკეთესი წაკითხვადობისთვის.");
      score += 5;
    } else if (wordCount > 15 && wordCount <= 70) {
      score += 15;
      tips.push("✅ პოსტის ზომა იდეალურია მარტივი წაკითხვისთვის.");
    } else {
      score += 5;
    }
  }

  // 2. Hashtags check
  const hashCount = (clean.match(/#/g) || []).length;
  if (platform === "instagram") {
    if (hashCount === 0) {
      score -= 15;
      tips.push("⚠️ Instagram პოსტი ჰეშთეგების გარეშე ვერ გავრცელდება. დაამატეთ 3-8 ჰეშთეგი.");
    } else if (hashCount > 12) {
      score -= 5;
      tips.push("💡 ზედმეტად ბევრი ჰეშთეგია. შეამცირეთ 5-8 ჰეშთეგამდე.");
    } else {
      score += 20;
      tips.push(`✅ დამატებულია ${hashCount} ჰეშთეგი.`);
    }
  } else if (platform === "linkedin") {
    if (hashCount === 0) {
      tips.push("💡 პროფესიული თემებისთვის სასურველია 2-3 რელევანტური ჰეშთეგი.");
    } else if (hashCount > 5) {
      score -= 5;
      tips.push("⚠️ LinkedIn-ზე ბევრი ჰეშთეგი სპამს ჰგავს. შეამცირეთ 3-მდე.");
    } else {
      score += 15;
    }
  } else {
    // Facebook, X
    if (hashCount > 0 && hashCount <= 4) {
      score += 10;
    } else if (hashCount > 5) {
      score -= 5;
      tips.push("💡 ამ პლატფორმისთვის ბევრი ჰეშთეგი არაა საჭირო. 1-3 საკმარისია.");
    }
  }

  // 3. CTA (Call To Action) check
  const hasCTA = selectedCta || /(დააჭირ|გაიგ|იხილ|დაგვიკავშირდ|მოგვწერ|შეიძინ|შეუკვეთ|ლინკ|ბმულ|დარეგისტრირდ|გვესტუმრ)/i.test(clean);
  if (hasCTA) {
    score += 20;
    tips.push(`✅ პოსტი შეიცავს მოქმედებისკენ მოწოდებას (CTA): "${selectedCta || 'ტექსტში ნაპოვნია'}"`);
  } else {
    score -= 10;
    tips.push("⚠️ პოსტში არ ჩანს მკაფიო მოწოდება მოქმედებისკენ (მაგ. 'გაიგე მეტი', 'მოგვწერეთ').");
  }

  // 4. Emoji check
  // Uses a simple regex to detect emoji range or characters
  const hasEmoji = /[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}/gu.test(clean);
  if (hasEmoji) {
    score += 10;
    tips.push("✅ პოსტი უფრო ცოცხალია emoji-ების გამოყენებით.");
  } else {
    tips.push("💡 დაამატეთ 1-2 emoji პოსტის გასაფერადებლად.");
  }

  // Constrain score
  score = Math.max(10, Math.min(100, score));

  let grade: EngagementReport["grade"] = "F";
  let colorClass = "text-rose-500 border-rose-500/20 bg-rose-500/10";
  if (score >= 90) {
    grade = "A";
    colorClass = "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
  } else if (score >= 75) {
    grade = "B";
    colorClass = "text-teal-400 border-emerald-500/20 bg-teal-500/10";
  } else if (score >= 60) {
    grade = "C";
    colorClass = "text-amber-400 border-amber-500/20 bg-amber-500/10";
  } else if (score >= 45) {
    grade = "D";
    colorClass = "text-orange-500 border-orange-500/20 bg-orange-500/10";
  }

  return { score, grade, colorClass, tips };
}
