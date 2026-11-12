import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { getOwnerPets, updateOwnerPet, type OwnerPet, type PetSpecies } from '../../auth/api';
import type { OwnerNav } from '../types';
import s from './Screens.module.css';

const SPECIES: PetSpecies[] = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];

function isPetSpecies(value: string): value is PetSpecies {
  return SPECIES.includes(value as PetSpecies);
}

function manilaToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function petAvatar(species: PetSpecies): string {
  if (species === 'Dog') return '🐶';
  if (species === 'Cat') return '🐱';
  if (species === 'Bird') return '🐦';
  if (species === 'Rabbit') return '🐰';
  return '🐾';
}

function petAge(value: string | null): string {
  if (!value) return 'Age not provided';
  const birth = new Date(`${value.slice(0, 10)}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 12) return `${Math.max(0, months)} months old`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder ? `${years} yr ${remainder} mo` : `${years} ${years === 1 ? 'year' : 'years'} old`;
}

export function OwnerPetProfile({ id, nav }: { id: string; nav: OwnerNav }) {
  const [pet, setPet] = useState<OwnerPet | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getOwnerPets().then(({ pets }) => {
      if (active) setPet(pets.find((item) => item.id === id) ?? null);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load this pet profile.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pet) return;
    const form = new FormData(event.currentTarget);
    const name = form.get('name');
    const species = form.get('species');
    const breed = form.get('breed');
    const dateOfBirth = form.get('dateOfBirth');
    if (
      typeof name !== 'string' || typeof species !== 'string' || !isPetSpecies(species)
      || typeof breed !== 'string' || typeof dateOfBirth !== 'string'
    ) {
      setError('Complete the pet profile details.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { pet: updated } = await updateOwnerPet(pet.id, {
        name,
        species,
        breed,
        dateOfBirth: dateOfBirth || null,
      });
      setPet(updated);
      setEditing(false);
      setNotice(`${updated.name}’s profile was updated.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update this pet profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={s.empty} aria-live="polite">Loading pet profile…</p>;
  if (!pet) {
    return (
      <section className={`${s.card} ${s.emptyCard}`}>
        <h1>Pet profile not found</h1>
        {error && <p className={s.pageError} role="alert">{error}</p>}
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={nav.home}>Back to home</button>
      </section>
    );
  }

  return (
    <div className={s.stack}>
      <nav className={s.breadcrumb} aria-label="Breadcrumb"><button type="button" className={s.crumb} onClick={nav.home}>Home</button><Icon name="crumb-chev" size={14} /><span className={s.crumbHere}>{pet.name}</span></nav>
      {error && <p className={s.pageError} role="alert">{error}</p>}
      {notice && <p className={s.successMessage} role="status">{notice}</p>}
      <section className={`${s.card} ${s.petProfileHero}`}>
        <div className={s.petProfilePhoto}>{petAvatar(pet.species)}</div>
        <div className={s.petProfileInfo}>
          <span className={`${s.badge} ${s.badgeSage}`}>Pet profile</span>
          <h1>{pet.name}</h1>
          <p>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
          <p>{petAge(pet.dateOfBirth)}</p>
          <div className={s.petProfileActions}>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => nav.book(undefined, pet.id)}>Book a visit</button>
            <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => nav.records(pet.id)}>Medical records</button>
            <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={nav.messages}>Message the clinic</button>
          </div>
        </div>
        <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel editing' : 'Edit profile'}</button>
      </section>
      {editing && (
        <form className={`${s.card} ${s.profileForm}`} onSubmit={(event) => void save(event)}>
          <h2 className={s.formHeading}>Pet details</h2>
          <label>Name<input name="name" defaultValue={pet.name} required maxLength={80} /></label>
          <label>Species<select name="species" defaultValue={pet.species}>{SPECIES.map((species) => <option key={species}>{species}</option>)}</select></label>
          <label>Breed<input name="breed" defaultValue={pet.breed} maxLength={80} /></label>
          <label>Date of birth<input type="date" name="dateOfBirth" defaultValue={pet.dateOfBirth?.slice(0, 10) ?? ''} max={manilaToday()} /></label>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>{saving ? 'Saving…' : 'Save pet details'}</button>
        </form>
      )}
      <section className={`${s.card} ${s.petProfileNote}`}>
        <span className={s.quickIcon}><Icon name="quick-file" size={24} /></span>
        <div><h2>Connected care history</h2><p>Appointments, visit notes, treatments, follow-up plans, and test results for {pet.name} are grouped in the medical records view.</p></div>
        <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => nav.records(pet.id)}>View records</button>
      </section>
    </div>
  );
}
