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
