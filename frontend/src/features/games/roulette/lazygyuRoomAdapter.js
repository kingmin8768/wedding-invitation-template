import options from './core/options';
import { Roulette } from './core/roulette';
import { RouletteRenderer } from './core/rouletteRenderer';
import { applyRouletteWinnerRank } from '../../../lib/lazygyuWinnerRank.js';

class LocalRoomRenderer extends RouletteRenderer {
  createKeywordService() {
    return {
      async init() {},
      destroy() {},
      getSprite() {
        return undefined;
      },
    };
  }
}

export class LazygyuRoomAdapter {
  constructor() {
    this.renderer = new LocalRoomRenderer();
    this.roulette = null;
    this.currentEntries = [];
    this.currentSeed = '';
    this.startedRoundId = null;
    this.readyPromise = Promise.resolve();
  }

  mount(target) {
    if (this.roulette) {
      return;
    }

    this.renderer.setMountTarget(target);
    this.renderer.setShowWinner(true);
    options.useSkills = true;

    this.roulette = new Roulette({
      renderer: this.renderer,
    });
    this.roulette.setAutoRecording(false);
    this.roulette.setTheme('dark');
    this.readyPromise = this.waitUntilReady();
  }

  getCanvas() {
    return this.renderer?.canvas || null;
  }

  setSkillsEnabled(enabled) {
    options.useSkills = Boolean(enabled);
  }

  setWinnerRank(rank) {
    applyRouletteWinnerRank(this.roulette, rank, options);
  }

  addGoalListener(listener) {
    this.roulette?.addEventListener('goal', listener);

    return () => {
      this.roulette?.removeEventListener('goal', listener);
    };
  }

  async waitUntilReady() {
    if (!this.roulette) {
      return;
    }

    while (this.roulette && !this.roulette.isReady) {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
  }

  async setEntries(names, seed = this.currentSeed) {
    if (!this.roulette) {
      return;
    }

    await this.waitUntilReady();
    if (!this.roulette) {
      return;
    }

    this.currentEntries = names.slice();
    this.currentSeed = seed || '';
    this.roulette.setSeed(this.currentSeed);
    this.roulette.setMarbles(this.currentEntries);
  }

  async appendEntry(name) {
    this.currentEntries = [...this.currentEntries, name];
    await this.setEntries(this.currentEntries);
  }

  setSeed(seed) {
    this.currentSeed = seed || '';
    this.roulette?.setSeed(this.currentSeed);
  }

  async startRound({
    roundId,
    seed,
    snapshotEntries,
    names,
    winnerRank = 0,
  }) {
    if (!this.roulette || this.startedRoundId === roundId) {
      return;
    }

    await this.waitUntilReady();
    if (!this.roulette) {
      return;
    }

    this.startedRoundId = roundId;
    this.currentSeed = seed;
    this.roulette.setSeed(seed);
    this.setWinnerRank(winnerRank);
    this.roulette.setAutoRecording(false);
    this.roulette.setTheme('dark');
    this.roulette.setMarbles(snapshotEntries || names || []);
    window.setTimeout(() => {
      this.roulette?.start();
    }, 140);
  }

  async resetRoom(entries = []) {
    this.startedRoundId = null;
    await this.setEntries(entries);
  }

  destroy() {
    this.roulette?.destroy();
    this.roulette = null;
    this.currentEntries = [];
    this.currentSeed = '';
    this.startedRoundId = null;
  }
}
