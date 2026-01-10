const technologies = [
  {
    name: 'Terraform',
    category: 'Infrastructure',
    logo: (
      <svg viewBox="0 0 128 128" className="h-12 w-12">
        <path fill="#5C4EE5" d="M77.941 44.5v36.836L46.324 62.918V26.082z" />
        <path fill="#5C4EE5" d="M81.41 81.336l31.633-18.418V26.082L81.41 44.5z" />
        <path fill="#5C4EE5" d="M11.242 42.36L42.86 60.778V23.943L11.242 5.525z" />
        <path fill="#5C4EE5" d="M46.324 101.918l31.617 18.418V83.5L46.324 65.082z" />
      </svg>
    ),
  },
  {
    name: 'Kubernetes',
    category: 'Orchestration',
    logo: (
      <svg viewBox="0 0 128 128" className="h-12 w-12">
        <path
          fill="#326CE5"
          d="M64 1.3c-1.7 0-3.3.3-4.7.8L14 21.4c-2.8 1.2-5 4-5.7 7.2L.7 81.9c-.7 3.2.3 6.5 2.5 8.9l35.3 41.4c2.2 2.4 5.4 3.8 8.6 3.8h33.8c3.2 0 6.4-1.4 8.6-3.8l35.3-41.4c2.2-2.4 3.2-5.7 2.5-8.9l-7.6-53.3c-.7-3.2-2.9-6-5.7-7.2L68.7 2.1c-1.4-.5-3-.8-4.7-.8z"
        />
        <path
          fill="#fff"
          d="M64 16.7c-1.3 0-2.5.3-3.6 1l-30.3 17.5c-2.2 1.3-3.6 3.6-3.6 6.2v35c0 2.6 1.4 4.9 3.6 6.2l30.3 17.5c2.2 1.3 5 1.3 7.2 0l30.3-17.5c2.2-1.3 3.6-3.6 3.6-6.2v-35c0-2.6-1.4-4.9-3.6-6.2L67.6 17.7c-1.1-.7-2.3-1-3.6-1z"
        />
        <path fill="#326CE5" d="M64 33l-21 12.1v24.3L64 81.5l21-12.1V45.1z" />
      </svg>
    ),
  },
  {
    name: 'Docker',
    category: 'Containers',
    logo: (
      <svg viewBox="0 0 128 128" className="h-12 w-12">
        <path
          fill="#019BC6"
          d="M124.8 52.1c-4.3-2.5-10-2.8-14.8-1.4-.6-5.2-4-9.7-8-12.9l-1.6-1.3-1.4 1.6c-2.7 3.1-3.5 8.3-3.1 12.3.3 2.9 1.2 5.9 3 8.3-1.4.8-2.9 1.9-4.3 2.4-2.8 1-5.9 2-8.9 2H79V49H66V24H41v12H28v13H7.4l-.3 2.5c-.6 5.4.2 10.7 2.1 15.7l.2.6v.1c7.2 14.2 21.5 19.3 34.7 19.3 24.9 0 47.5-12 56.3-38.4 6.2.4 13.2-1.5 16.5-7.1l.8-1.4-1-1.2c-1-1.4-2.3-2.6-3.9-3.5zm-84 10.9H28v-13h12.9v13zm16-25H52v13h12.9V38zm0 25H52V50h12.9v13zm16-25H69v13h12.9V38zm0 25H69V50h12.9v13z"
        />
      </svg>
    ),
  },
  {
    name: 'AWS',
    category: 'Cloud',
    logo: (
      <svg viewBox="0 0 128 128" className="h-12 w-12">
        <path
          fill="#F7A80D"
          d="M38.089 77.466l-11.4 4.896 10.559 4.514 12.241-4.514-11.4-4.896zm-1.153 23.106V85.158l-12.165-4.89v15.61l12.165 4.694zm3.153-.038l12.165-4.656V80.268l-12.165 4.89v15.376z"
        />
        <path
          fill="#F7A80D"
          d="M77.911 77.466l-11.4 4.896 10.559 4.514 12.241-4.514-11.4-4.896zm-1.152 23.106V85.158l-12.166-4.89v15.61l12.166 4.694zm3.152-.038l12.166-4.656V80.268l-12.166 4.89v15.376z"
        />
        <path
          fill="#F7A80D"
          d="M58 48.466l-11.4 4.896 10.559 4.514 12.241-4.514L58 48.466zm-1.153 23.106V56.158l-12.165-4.89v15.61l12.165 4.694zm3.153-.038l12.165-4.656V51.268l-12.165 4.89v15.376z"
        />
      </svg>
    ),
  },
  {
    name: 'Azure',
    category: 'Cloud',
    logo: (
      <svg viewBox="0 0 128 128" className="h-12 w-12">
        <path
          fill="#0089D6"
          d="M46.7 23H75l-28.1 85.2-20.6.2L46.7 23zm34.3 62.4L51.7 108l31.5.1 2.5-22.7h-4.7zm-13.8-56L53.7 92.1H77L81 77.8l-13.8 7.6z"
        />
      </svg>
    ),
  },
  {
    name: 'GCP',
    category: 'Cloud',
    logo: (
      <svg viewBox="0 0 128 128" className="h-12 w-12">
        <path
          fill="#4285F4"
          d="M80.6 40.3h.4l-.2-.2 14-14-.1-.1C83.8 14.1 69.2 8 53.8 8 26.3 8 4 29.8 4 56.8c0 10.9 3.7 21.5 10.5 30.1l19.8-19.8c-3.2-4.4-5-9.7-5-15.3.1-14.8 12.4-26.8 27.5-26.8 8.1 0 15.4 3.5 20.4 9l3.4 3.3z"
        />
        <path
          fill="#34A853"
          d="M102.9 26.2l-3.4 3.4c6.2 7.8 9.5 17.4 9.3 27.5-.2 14.8-12.4 26.8-27.5 26.8-8.1 0-15.4-3.5-20.4-9l-3.4 3.4-19.8 19.8c10.8 13 27 20.9 44.6 20.9 33.1 0 57.8-27.3 54.6-61-.9-10.6-5.3-20.5-12.2-28.6l-21.8-3.2z"
        />
        <path
          fill="#FBBC05"
          d="M14.5 86.9l21.8-21.8c-3.3-4.4-5-9.7-5-15.3.1-14.8 12.4-26.8 27.5-26.8 8.1 0 15.4 3.5 20.4 9l17.4-17.4C85.8 3.5 70.9-2.7 55.2-.4 26.7 3.2 4 27.3 4 56.8c0 10.9 3.7 21.5 10.5 30.1z"
        />
        <path
          fill="#EA4335"
          d="M81.2 83.8c-8.1 0-15.4-3.5-20.4-9l-24.6 24.6c10.8 13 27 20.9 44.6 20.9 15.4 0 29.8-5.8 40.7-16.4l-19.9-19.9c-5.1 2.6-10.9 4-17 4-.9-.1-2.3-.1-3.4-.2z"
        />
      </svg>
    ),
  },
  {
    name: 'GitHub Actions',
    category: 'CI/CD',
    logo: (
      <svg viewBox="0 0 128 128" className="h-12 w-12">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          fill="#24292f"
          className="dark:fill-white"
          d="M64 5.103c-33.347 0-60.388 27.035-60.388 60.388 0 26.682 17.303 49.317 41.297 57.303 3.017.56 4.125-1.31 4.125-2.905 0-1.44-.056-6.197-.082-11.243-16.8 3.653-20.345-7.125-20.345-7.125-2.747-6.98-6.705-8.836-6.705-8.836-5.48-3.748.413-3.67.413-3.67 6.063.425 9.257 6.223 9.257 6.223 5.386 9.23 14.127 6.562 17.573 5.02.542-3.903 2.107-6.568 3.834-8.076-13.413-1.525-27.514-6.704-27.514-29.843 0-6.593 2.36-11.98 6.223-16.21-.628-1.52-2.695-7.662.584-15.98 0 0 5.07-1.623 16.61 6.19C53.7 35 58.867 34.327 64 34.304c5.13.023 10.3.694 15.127 2.033 11.526-7.813 16.59-6.19 16.59-6.19 3.287 8.317 1.22 14.46.593 15.98 3.872 4.23 6.215 9.617 6.215 16.21 0 23.194-14.127 28.3-27.574 29.796 2.167 1.874 4.097 5.55 4.097 11.183 0 8.08-.07 14.583-.07 16.572 0 1.607 1.088 3.49 4.148 2.897 23.98-7.994 41.263-30.622 41.263-57.294C124.388 32.14 97.35 5.104 64 5.104z"
        />
      </svg>
    ),
  },
  {
    name: 'ArgoCD',
    category: 'GitOps',
    logo: (
      <svg viewBox="0 0 128 128" className="h-12 w-12">
        <path
          fill="#EF7B4D"
          d="M64 8C33.1 8 8 33.1 8 64s25.1 56 56 56 56-25.1 56-56S94.9 8 64 8zm0 96c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z"
        />
        <path fill="#EF7B4D" d="M64 40c-13.3 0-24 10.7-24 24s10.7 24 24 24 24-10.7 24-24-10.7-24-24-24z" />
      </svg>
    ),
  },
];

export function TechStack() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            Battle-Tested Technology Stack
          </h2>
          <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            We leverage industry-leading tools and platforms to deliver
            enterprise-grade solutions.
          </p>
        </div>

        {/* Tech Grid */}
        <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-8">
          {technologies.map((tech) => (
            <div
              key={tech.name}
              className="group flex flex-col items-center justify-center rounded-xl border border-border-light bg-surface-light p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg dark:border-border-dark dark:bg-surface-dark"
            >
              <div className="transition-transform duration-300 group-hover:scale-110">
                {tech.logo}
              </div>
              <span className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
                {tech.name}
              </span>
              <span className="text-xs text-neutral-500">{tech.category}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
