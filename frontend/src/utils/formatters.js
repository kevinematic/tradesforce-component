/**
 * Format posted date as relative time or absolute date
 */
export function formatPostedDate(dateString) {
  if (!dateString) return "Date not available";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // Format as "Feb 18, 2026"
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}

/**
 * Format salary range
 */
export function formatSalary(min, max) {
  if (!min && !max) {
    return "Salary not listed";
  }

  const formatAmount = (amount) => {
    if (amount >= 1000) {
      return `$${Math.round(amount / 1000)}k`;
    }
    return `$${amount}`;
  };

  if (min && max) {
    return `${formatAmount(min)} – ${formatAmount(max)}`;
  } else if (min) {
    return `${formatAmount(min)}+`;
  } else {
    return `Up to ${formatAmount(max)}`;
  }
}

/**
 * Format contract information
 */
export function formatContractInfo(contractType, contractTime) {
  const parts = [];

  if (contractType) {
    parts.push(contractType === "permanent" ? "Permanent" : "Contract");
  }

  if (contractTime) {
    parts.push(contractTime === "full_time" ? "Full-time" : "Part-time");
  }

  return parts.join(" · ");
}
