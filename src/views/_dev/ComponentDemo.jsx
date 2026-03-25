import { useState } from 'react';
import { DiceRoller } from '@components/DiceRoller';
import { HealthBar } from '@components/HealthBar';
import { StatCard } from '@components/StatCard';
import { ActionButton } from '@components/ActionButton';
import { Modal } from '@components/Modal';
import { NarratorBox } from '@components/NarratorBox';
import { TurnOrderBar } from '@components/TurnOrderBar';
import { ZoneCard } from '@components/ZoneCard';

const DEMO_ENTITIES = [
  { id: 'p1', name: 'Aldric',  icon: '⚔️',  isActive: true,  isDead: false, isPlayer: true  },
  { id: 'p2', name: 'Mira',    icon: '🏹',  isActive: false, isDead: false, isPlayer: true  },
  { id: 'p3', name: 'Zynn',    icon: '🔮',  isActive: false, isDead: true,  isPlayer: true  },
  { id: 'b1', name: 'Tzorath', icon: '🐉',  isActive: false, isDead: false, isPlayer: false },
];

const DEMO_ZONE = {
  id: 'verdant-maw',
  name: 'Verdant Maw',
  subtitle: 'Hunting Ground',
  description: 'A dense tangle of ancient roots and hanging vines. The air is thick with spores and the distant sound of something large moving through the undergrowth.',
  retreatModifier: -2,
  trapBonus: 3,
  wildlife: {
    creature: 'Razorwing Bat',
    type: 'ambient',
    attackChance: 0.25,
    attackDamage: '1d4',
  },
  connectedZones: ['Razorback Canopy', 'Obsidian Grotto'],
};

const NARRATOR_MESSAGES = [
  { id: '1', text: 'The party descends into the Verdant Maw, leaves crunching underfoot.' },
  { id: '2', text: 'Aldric draws his blade. Something stirs in the shadows ahead.' },
  { id: '3', text: 'Tzorath the Ancient has been sighted. The hunt begins.' },
];

export default function ComponentDemo() {
  const [rolling, setRolling] = useState(false);
  const [diceResult, setDiceResult] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(true);

  function handleRoll() {
    setDiceResult(null);
    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      setDiceResult(17);
    }, 1500);
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-secondary)' }}>Component Demo — Phase 1</h1>

      {/* DiceRoller */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>DiceRoller</h2>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <DiceRoller rolling={rolling} result={diceResult} showLabel />
          <ActionButton label="Roll D20" onClick={handleRoll} variant="primary" />
        </div>
      </section>

      {/* HealthBar */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>HealthBar</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '320px' }}>
          <HealthBar current={80} max={100} label="Aldric" size="md" showText />
          <HealthBar current={42} max={100} label="Mira" size="md" showText />
          <HealthBar current={15} max={100} label="Zynn" size="md" showText />
          <HealthBar current={320} max={400} label="Tzorath" size="lg" showText />
        </div>
      </section>

      {/* StatCard */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>StatCard</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <StatCard icon="⚔️" label="Attack" value={14} modifier={3} />
          <StatCard icon="🛡️" label="Defense" value={8} modifier={-1} />
          <StatCard icon="💨" label="Speed" value={12} />
        </div>
      </section>

      {/* ActionButton variants */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>ActionButton</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <ActionButton label="Primary" variant="primary" onClick={() => {}} />
          <ActionButton label="Secondary" variant="secondary" onClick={() => {}} />
          <ActionButton label="Danger" variant="danger" onClick={() => {}} />
          <ActionButton label="Ghost" variant="ghost" onClick={() => {}} />
          <ActionButton label="Disabled" variant="primary" disabled onClick={() => {}} />
          <ActionButton icon="⚔️" label="With Icon" variant="primary" onClick={() => {}} />
        </div>
      </section>

      {/* NarratorBox */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>NarratorBox</h2>
        <div style={{ maxWidth: '540px', height: '160px' }}>
          <NarratorBox messages={NARRATOR_MESSAGES} typewriterSpeed={20} />
        </div>
      </section>

      {/* TurnOrderBar */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>TurnOrderBar</h2>
        <TurnOrderBar entities={DEMO_ENTITIES} round={3} />
      </section>

      {/* Modal */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Modal</h2>
        <ActionButton label="Open Modal" variant="secondary" onClick={() => setModalOpen(true)} />
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm Action"
          size="md"
          actions={[
            { label: 'Cancel', variant: 'ghost', onClick: () => setModalOpen(false) },
            { label: 'Confirm', variant: 'primary', onClick: () => setModalOpen(false) },
          ]}
        >
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Are you sure you want to attack Tzorath the Ancient? This action cannot be undone.
          </p>
        </Modal>
      </section>

      {/* ZoneCard */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>ZoneCard</h2>
        {zoneOpen ? (
          <ZoneCard
            zone={DEMO_ZONE}
            onClose={() => setZoneOpen(false)}
            activeTraps={[{ name: 'Snare Pit' }, { name: 'Vine Tether' }]}
          />
        ) : (
          <ActionButton label="Show Zone Card" variant="secondary" onClick={() => setZoneOpen(true)} />
        )}
      </section>
    </div>
  );
}
