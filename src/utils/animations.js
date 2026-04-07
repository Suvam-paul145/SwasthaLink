// Animation utilities using Framer Motion for SwasthaLink

export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 40 },
  transition: { duration: 0.5, ease: 'easeOut' }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.3 }
};

export const slideInFromRight = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

export const slideInFromLeft = {
  initial: { opacity: 0, x: -100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
  transition: { duration: 0.4, ease: 'easeOut' }
};

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const cardHover = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};

export const buttonTap = {
  scale: 0.95,
  transition: { duration: 0.1 }
};

// Glass morphism pulse effect
export const glassPulse = {
  initial: {
    backdropFilter: 'blur(12px)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)'
  },
  animate: {
    backdropFilter: ['blur(12px)', 'blur(16px)', 'blur(12px)'],
    backgroundColor: [
      'rgba(15, 23, 42, 0.6)',
      'rgba(15, 23, 42, 0.7)',
      'rgba(15, 23, 42, 0.6)'
    ],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// Medical heartbeat animation
export const heartbeat = {
  animate: {
    scale: [1, 1.1, 1, 1.1, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// Loading spinner variations
export const spinnerRotate = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

export const progressBar = {
  initial: { width: '0%' },
  animate: (custom) => ({
    width: `${custom}%`,
    transition: {
      duration: 1,
      ease: 'easeOut'
    }
  })
};

// Page transition for dashboard route changes
export const pageTransition = {
  initial: { opacity: 0, y: 16, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(4px)' },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
};

// Dashboard section entrance
export const sectionReveal = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
};

// Table row entrance
export const tableRowIn = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.25 }
};

// Stat number counter pop
export const numberPop = {
  initial: { opacity: 0, scale: 0.5, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }
};

// Sidebar link hover
export const navLinkHover = {
  rest: { x: 0, backgroundColor: 'rgba(255,255,255,0)' },
  hover: {
    x: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    transition: { duration: 0.2 }
  }
};

// Dashboard card stagger (faster)
export const dashboardStagger = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1
    }
  }
};

// Shimmer loading placeholder
export const shimmer = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: { duration: 1.5, repeat: Infinity, ease: 'linear' }
  }
};

// Glow pulse for active elements
export const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 0px rgba(79, 219, 200, 0)',
      '0 0 20px rgba(79, 219, 200, 0.3)',
      '0 0 0px rgba(79, 219, 200, 0)'
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
  }
};
