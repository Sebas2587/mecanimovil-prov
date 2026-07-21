# design-system (delta)

## ADDED Requirements

### Requirement: Paleta Airbnb Hosts + Tinder
Colors SHALL follow semantic roles from PaletaColor Pro. Primary CTA uses brand gradient magenta→orange. `COLORS.institutional` SHALL alias the new palette for backward compatibility.

### Requirement: Tipografía Poppins
Typography SHALL use Poppins 400/500/600. Inter is deprecated.

### Requirement: Superficies sin glass
Glass gradients SHALL NOT be used. Canvas `#F9F9F9`, cards on paper with hairline borders.

### Requirement: Primitivos base
The app SHALL provide Card, AppHeader, BottomSheet, and restyled Institutional* components consuming tokens only.

### Requirement: Host surfaces canónicas
The design system SHALL export `HostPaperSection`, `HostSectionKicker`, `HostMetricRow`, `HostProgressRow`, and `hostScreenStyles` from `@/app/design-system/components`. Feature screens SHALL reuse these instead of inventing nested paper wells or double horizontal padding. `Card` SHALL default to Host padding and editorial shadow; brand fills SHALL NOT be used on card surfaces.
