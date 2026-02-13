# Sound Effects for Job Wars

This directory should contain the following sound effect files (MP3 format):

## Required Sound Files

- `card-play.mp3` - Played when a card is hired or an event is cast
- `card-draw.mp3` - Played when drawing a card
- `combat.mp3` - Played when attackers are declared
- `damage.mp3` - Played when damage is dealt to a player
- `phase-change.mp3` - Played when the game phase changes
- `victory.mp3` - Played when the player wins
- `defeat.mp3` - Played when the player loses
- `button-click.mp3` - Played for UI interactions (optional)
- `card-destroy.mp3` - Played when a card is destroyed
- `shuffle.mp3` - Played when shuffling the deck

## Getting Sound Effects

You can get free sound effects from:
- [Freesound.org](https://freesound.org/)
- [OpenGameArt.org](https://opengameart.org/)
- [Zapsplat.com](https://www.zapsplat.com/)
- [Mixkit.co](https://mixkit.co/free-sound-effects/)

## Recommended Characteristics

- Format: MP3
- Duration: 0.5-2 seconds (short and punchy)
- Volume: Normalized to avoid clipping
- Style: Game-appropriate, not too loud or distracting

## Creating Placeholder Sounds

If you want to test without sounds, the game will work fine - the sound service gracefully handles missing files. The sounds are optional enhancements to the gameplay experience.

To disable sounds entirely, use the sound settings in the game (coming soon) or set `enabled: false` in localStorage under the key `soundSettings`.
