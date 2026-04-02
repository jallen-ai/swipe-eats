import { getCuisineGroup } from './cuisine';

export class PreferenceEngine {
  constructor() {
    this.swipeHistory = [];
    this.orderHistory = [];
    this.shakeUpActive = false;
  }

  recordSwipe(restaurant, direction) {
    this.swipeHistory.push({
      restaurantId: restaurant.id,
      direction,
      cuisine: restaurant.cuisine,
      cuisineGroup: getCuisineGroup(restaurant.cuisine),
      timestamp: Date.now(),
    });
  }

  recordOrder(restaurant) {
    this.orderHistory.push({
      restaurantId: restaurant.id,
      cuisine: restaurant.cuisine,
      cuisineGroup: getCuisineGroup(restaurant.cuisine),
      timestamp: Date.now(),
    });
  }

  getScore(restaurant) {
    let score = 50;

    const recentOrder = this.orderHistory.find(o => o.restaurantId === restaurant.id);
    if (recentOrder) {
      const daysSince = (Date.now() - recentOrder.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSince < 3) score -= 40;
      else if (daysSince < 7) score -= 20;
    }

    const cuisineSwipes = this.swipeHistory.filter(s => s.cuisine === restaurant.cuisine);
    const rightSwipes = cuisineSwipes.filter(s => s.direction === 'right').length;
    const leftSwipes = cuisineSwipes.filter(s => s.direction === 'left').length;
    if (cuisineSwipes.length > 0) {
      const preference = (rightSwipes - leftSwipes) / cuisineSwipes.length;
      score += preference * 20;
    }

    const recentGroupSwipes = this.swipeHistory.slice(-5).filter(
      s => s.cuisineGroup === getCuisineGroup(restaurant.cuisine)
    ).length;
    score -= recentGroupSwipes * 5;

    if (this.shakeUpActive) {
      score = 100 - score;
      this.shakeUpActive = false;
    }

    score += (Math.random() - 0.5) * 15;

    return Math.max(0, Math.min(100, score));
  }

  sortRestaurants(restaurants) {
    return [...restaurants]
      .map(r => ({ ...r, _score: this.getScore(r) }))
      .sort((a, b) => b._score - a._score);
  }

  shakeUp() {
    this.shakeUpActive = true;
  }
}
