export class Animation {
    static stretchAndSquash(frames) {
        const animationFrames = [];
        const duration = frames / 3; // Divide into three phases

        for (let i = 0; i < frames; i++) {
            let scaleX = 1, scaleY = 1;

            if (i < duration) {
                // Stretch upwards (narrower and taller)
                const progress = i / duration;
                scaleX = 1 - 0.2 * progress;
                scaleY = 1 + 0.3 * progress;
            } else if (i < 2 * duration) {
                // Return to normal
                const progress = (i - duration) / duration;
                scaleX = 0.8 + 0.2 * progress;
                scaleY = 1.3 - 0.3 * progress;
            } else {
                // Squash (wider and shorter)
                const progress = (i - 2 * duration) / duration;
                scaleX = 1 + 0.1 * (1 - progress);
                scaleY = 1 - 0.1 * (1 - progress);
            }

            animationFrames.push({ scaleX, scaleY });
        }

        return animationFrames;
    }
}