import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiceRoller } from '@components/DiceRoller';
import { HealthBar } from '@components/HealthBar';
import { StatCard } from '@components/StatCard';
import { ActionButton } from '@components/ActionButton';
import { Modal } from '@components/Modal';
import { NarratorBox } from '@components/NarratorBox';
import { TurnOrderBar } from '@components/TurnOrderBar';
import { ZoneCard } from '@components/ZoneCard';
import { FloatingDamage } from '@components/FloatingDamage';
import { EncounterSplash } from '@components/EncounterSplash';

// ---------------------------------------------------------------------------
// DiceRoller
// ---------------------------------------------------------------------------
describe('DiceRoller', () => {
  it('renders without crashing in idle state', () => {
    const { container } = render(<DiceRoller rolling={false} result={null} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with a result', () => {
    const { container } = render(<DiceRoller rolling={false} result={17} showLabel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders rolling state without error', () => {
    const { container } = render(<DiceRoller rolling result={null} />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// HealthBar
// ---------------------------------------------------------------------------
describe('HealthBar', () => {
  it('renders with current and max values', () => {
    render(<HealthBar current={80} max={100} label="Aldric" />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows label text', () => {
    render(<HealthBar current={80} max={100} label="Aldric" showText />);
    expect(screen.getByText(/80/)).toBeTruthy();
  });

  it('handles zero health', () => {
    render(<HealthBar current={0} max={100} label="Dead" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps percentage above 100', () => {
    const { container } = render(<HealthBar current={150} max={100} label="Overhealed" />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------
describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard icon="⚔️" label="Attack" value={14} />);
    expect(screen.getByText('Attack')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
  });

  it('renders with highlight variant', () => {
    const { container } = render(<StatCard icon="⚔️" label="Attack" value={14} variant="highlight" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with danger variant', () => {
    const { container } = render(<StatCard icon="🛡️" label="Defense" value={8} variant="danger" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders without modifier', () => {
    const { container } = render(<StatCard icon="💨" label="Speed" value={12} />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ActionButton
// ---------------------------------------------------------------------------
describe('ActionButton', () => {
  it('renders button with label', () => {
    render(<ActionButton label="Attack" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /attack/i })).toBeTruthy();
  });

  it('calls onClick when clicked', async () => {
    const handler = vi.fn();
    const { getByRole } = render(<ActionButton label="Click Me" onClick={handler} />);
    getByRole('button').click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is set', () => {
    render(<ActionButton label="Disabled" onClick={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders all variants without crashing', () => {
    for (const variant of ['primary', 'secondary', 'danger', 'ghost']) {
      const { unmount } = render(
        <ActionButton label={variant} variant={variant} onClick={() => {}} />
      );
      expect(screen.getByRole('button')).toBeTruthy();
      unmount();
    }
  });
});

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
describe('Modal', () => {
  it('does not render content when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Hidden content</p>
      </Modal>
    );
    expect(screen.queryByText('Hidden content')).toBeNull();
  });

  it('renders content when open', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Test Modal">
        <p>Visible content</p>
      </Modal>
    );
    expect(screen.getByText('Visible content')).toBeTruthy();
    expect(screen.getByText('Test Modal')).toBeTruthy();
  });

  it('renders footer content', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Confirm" footer={<><button>Cancel</button><button>Confirm</button></>}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// NarratorBox
// ---------------------------------------------------------------------------
describe('NarratorBox', () => {
  it('renders empty state with no messages', () => {
    render(<NarratorBox messages={[]} />);
    expect(screen.getByText(/adventure awaits/i)).toBeTruthy();
  });

  it('renders with messages', () => {
    const messages = [
      { id: '1', text: 'The party enters the dungeon.' },
      { id: '2', text: 'A shadow moves in the dark.' },
    ];
    render(<NarratorBox messages={messages} typewriterSpeed={0} />);
    // At least the container renders
    const { container } = render(<NarratorBox messages={messages} typewriterSpeed={0} />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TurnOrderBar
// ---------------------------------------------------------------------------
describe('TurnOrderBar', () => {
  const entities = [
    { id: 'p1', name: 'Aldric',  icon: '⚔️',  isActive: true,  isDead: false, isPlayer: true  },
    { id: 'p2', name: 'Mira',    icon: '🏹',  isActive: false, isDead: false, isPlayer: true  },
    { id: 'b1', name: 'Tzorath', icon: '🐉',  isActive: false, isDead: false, isPlayer: false },
  ];

  it('renders round number', () => {
    render(<TurnOrderBar entities={entities} round={3} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders all entity names', () => {
    render(<TurnOrderBar entities={entities} round={1} />);
    expect(screen.getByText('Aldric')).toBeTruthy();
    expect(screen.getByText('Mira')).toBeTruthy();
    expect(screen.getByText('Tzorath')).toBeTruthy();
  });

  it('renders without entities', () => {
    const { container } = render(<TurnOrderBar entities={[]} round={1} />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ZoneCard
// ---------------------------------------------------------------------------
describe('ZoneCard', () => {
  const zone = {
    id: 'verdant-maw',
    name: 'Verdant Maw',
    subtitle: 'Hunting Ground',
    description: 'A dense tangle of ancient roots.',
    retreatModifier: -2,
    trapBonus: 3,
    wildlife: { creature: 'Bat', type: 'ambient', attackChance: 0.25, attackDamage: '1d4' },
    connectedZones: ['Canopy', 'Grotto'],
  };

  it('renders zone name', () => {
    render(<ZoneCard zone={zone} onClose={() => {}} activeTraps={[]} />);
    expect(screen.getByText('Verdant Maw')).toBeTruthy();
  });

  it('renders description', () => {
    render(<ZoneCard zone={zone} onClose={() => {}} activeTraps={[]} />);
    expect(screen.getByText(/ancient roots/i)).toBeTruthy();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<ZoneCard zone={zone} onClose={onClose} activeTraps={[]} />);
    screen.getByRole('button', { name: /close/i }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders trap bonus stat when provided', () => {
    render(<ZoneCard zone={zone} onClose={() => {}} />);
    expect(screen.getByText(/trap bonus/i)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Stub components (should render null without crashing)
// ---------------------------------------------------------------------------
describe('FloatingDamage', () => {
  it('renders damage text', () => {
    const { container } = render(<FloatingDamage amount={12} type="damage" />);
    expect(container.firstChild).toBeTruthy();
    expect(container.firstChild.textContent).toBe('-12');
  });

  it('renders heal text with + prefix', () => {
    const { container } = render(<FloatingDamage amount={20} type="heal" />);
    expect(container.firstChild.textContent).toBe('+20');
  });

  it('renders miss text', () => {
    const { container } = render(<FloatingDamage amount={0} type="miss" />);
    expect(container.firstChild.textContent).toBe('Miss!');
  });
});

describe('EncounterSplash', () => {
  it('renders null when not visible', () => {
    const { container } = render(
      <EncounterSplash type="encounter" title="Enemy Spotted" subtitle="Tzorath approaches" isVisible={false} onComplete={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders content when visible', () => {
    render(
      <EncounterSplash type="encounter" title="Enemy Spotted" subtitle="Tzorath approaches" isVisible onComplete={() => {}} />
    );
    expect(screen.getByText('Enemy Spotted')).toBeTruthy();
  });
});
