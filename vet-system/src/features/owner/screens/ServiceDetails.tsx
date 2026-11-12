import { useEffect, useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { Photo } from '../../../components/owner/Photo';
import { RailSection, ServiceMiniCard } from '../../../components/owner/OwnerParts';
import { getBookingDoctors, type BookingDoctor } from '../../auth/api';
import { CLINIC_ADDRESS } from '../../clinicInfo';
import { SERVICES } from '../data';
import { formatPeso, type OwnerNav, type Service } from '../types';
import s from './Screens.module.css';

export function ServiceDetails({ nav, service }: { nav: OwnerNav; service: Service }) {
  const [doctors, setDoctors] = useState<BookingDoctor[]>([]);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const others = SERVICES.filter((x) => x.id !== service.id);

  useEffect(() => {
    let active = true;
    getBookingDoctors().then(({ doctors: loaded }) => {
      if (active) {
        setDoctors(loaded);
        setDoctorError(null);
      }
    }).catch((error: unknown) => {
      if (active) setDoctorError(error instanceof Error ? error.message : 'Could not load clinic veterinarians.');
    });
    return () => { active = false; };
  }, []);

  return (
    <div className={s.stack}>
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <button type="button" className={s.crumb} onClick={() => nav.services()}>Actions</button>
        <Icon name="crumb-chev" size={14} />
        <span className={s.crumbHere}>{service.name}</span>
      </nav>

      <div className={s.detailCols}>
        <div className={s.detailLeft}>
          <Photo emoji={service.emoji} tone={service.tone} size={150} width="100%" height={300} radius={24} />

          <section className={`${s.card} ${s.panel}`}>
            <span className={`${s.badge} ${s.badgeSage}`}>{service.name}</span>
            <h1 className={s.panelTitle}>{service.headline}</h1>
            <p className={s.panelText}>{service.description}</p>
          </section>

          <section className={`${s.card} ${s.panel}`} style={{ gap: 16 }}>
            <h2>What is included</h2>
            <ul className={s.included} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {service.includes.map((item) => (
                <li key={item} className={s.includedItem}>
                  <span className={s.tick}><Icon name="check-sm" size={11} /></span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className={`${s.card} ${s.panel}`} style={{ gap: 16 }}>
            <h2>Active clinic veterinarians</h2>
            <div className={s.doctors}>
              {doctorError && <p className={s.pageError} role="alert">{doctorError}</p>}
              {!doctorError && doctors.length === 0 && <p className={s.empty}>No active veterinarians are listed right now.</p>}
              {doctors.map((doctor) => (
                <div key={doctor.id} className={s.doctor}>
                  <Photo emoji="👩‍⚕️" tone="sage" size={23} width={44} height={44} radius={99} />
                  <span>
                    <b>{doctor.fullName}</b>
                    <span>{doctor.specialization || 'Veterinarian'}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className={`${s.card} ${s.bookCard}`}>
          <div className={s.bookPrice}>
            <small>Starting at</small>
            <b>{formatPeso(service.price)}</b>
            <span>{service.priceUnit}</span>
          </div>
          <div className={s.divider} />
          {[
            { icon: 'info-clock', text: service.visit },
            { icon: 'info-pin', text: CLINIC_ADDRESS },
            { icon: 'info-shield', text: 'Licensed veterinarians' },
            { icon: 'info-calendar', text: 'Choose a date to see current appointment availability' },
          ].map((line) => (
            <div key={line.icon} className={s.infoLine}>
              <span className={s.infoIcon}><Icon name={line.icon as 'info-clock'} size={16} /></span>
              {line.text}
            </div>
          ))}
          <button type="button" className={`${s.btn} ${s.btnTall} ${s.btnPrimary} ${s.btnFull}`} onClick={() => nav.book(service.id)}>
            <Icon name="btn-calendar" size={18} />
            Book Service
          </button>
          <button type="button" className={`${s.btn} ${s.btnMid} ${s.btnSecondary} ${s.btnFull}`} onClick={nav.messages}>
            <Icon name="chat-sm" size={18} />
            Message the Clinic
          </button>
        </aside>
      </div>

      <RailSection title="Explore other services" subtitle="Everything your pet needs, under one roof" linkLabel="All 8 services" onLink={() => nav.services()}>
        {others.map((svc) => (
          <ServiceMiniCard key={svc.id} service={svc} width={200} onOpen={() => nav.service(svc.id)} />
        ))}
      </RailSection>
    </div>
  );
}
