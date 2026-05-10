import React, { ReactNode } from 'react';
import {
	ActivityIndicator,
	Pressable,
	StyleProp,
	StyleSheet,
	Text,
	TextStyle,
	TextInput,
	TextInputProps,
	TouchableOpacity,
	View,
	ViewStyle,
} from 'react-native';
import { theme } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

type ButtonProps = {
	title: string;
	onPress?: () => void;
	variant?: ButtonVariant;
	disabled?: boolean;
	loading?: boolean;
	style?: StyleProp<ViewStyle>;
};

type CardProps = {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
};

type InputProps = TextInputProps & {
	label?: string;
	helper?: string;
	prefix?: ReactNode;
	suffix?: ReactNode;
};

type MetricCardProps = {
	label: string;
	value: string;
	helper?: string;
	tone?: 'primary' | 'secondary' | 'accent' | 'success';
};

type PillProps = {
	label: string;
	tone?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
};

type SectionHeaderProps = {
	title: string;
	actionLabel?: string;
	onAction?: () => void;
};

export function Card({ children, style }: CardProps) {
	return <View style={[styles.card, style]}>{children}</View>;
}

export function Surface({ children, style }: CardProps) {
	return <View style={[styles.surface, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
	const containerStyle = [styles.buttonBase, buttonStyles[variant], disabled && styles.buttonDisabled, style];
	const textStyle = [styles.buttonTextBase, buttonTextStyles[variant], disabled && styles.buttonTextDisabled];

	return (
		<TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={disabled || loading} style={containerStyle}>
			{loading ? <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? theme.colors.white : theme.colors.primary} /> : <Text style={textStyle}>{title}</Text>}
		</TouchableOpacity>
	);
}

export function Input({ label, helper, prefix, suffix, style, ...props }: InputProps) {
	return (
		<View style={style}>
			{label ? <Text style={styles.label}>{label}</Text> : null}
			<View style={styles.inputShell}>
				{prefix ? <View style={styles.inputAddon}>{prefix}</View> : null}
				<TextInput
					{...props}
					placeholderTextColor={theme.colors.mutedSoft}
					style={[styles.input, props.multiline && styles.multiline, style as any]}
				/>
				{suffix ? <View style={styles.inputAddon}>{suffix}</View> : null}
			</View>
			{helper ? <Text style={styles.helper}>{helper}</Text> : null}
		</View>
	);
}

export function Pill({ label, tone = 'secondary' }: PillProps) {
	return (
		<View style={[styles.pill, pillStyles[tone]]}>
			<Text style={[styles.pillText, pillTextStyles[tone]]}>{label}</Text>
		</View>
	);
}

export function MetricCard({ label, value, helper, tone = 'primary' }: MetricCardProps) {
	return (
		<View style={[styles.metricCard, toneStyles[tone]]}>
			<Text style={styles.metricLabel}>{label}</Text>
			<Text style={styles.metricValue}>{value}</Text>
			{helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
		</View>
	);
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
	return (
		<View style={styles.sectionHeader}>
			<Text style={styles.sectionTitle}>{title}</Text>
			{actionLabel && onAction ? (
				<Pressable onPress={onAction}>
					<Text style={styles.sectionAction}>{actionLabel}</Text>
				</Pressable>
			) : null}
		</View>
	);
}

export function Divider() {
	return <View style={styles.divider} />;
}

export function AvatarBadge({ initials, tone = 'primary' }: { initials: string; tone?: 'primary' | 'secondary' | 'accent' }) {
	return <View style={[styles.avatar, avatarStyles[tone]]}><Text style={styles.avatarText}>{initials}</Text></View>;
}

export function InfoBanner({ title, message, tone = 'primary' }: { title: string; message: string; tone?: 'primary' | 'warning' | 'accent' }) {
	return (
		<View style={[styles.banner, bannerStyles[tone]]}>
			<Text style={styles.bannerTitle}>{title}</Text>
			<Text style={styles.bannerMessage}>{message}</Text>
		</View>
	);
}

export function StatLine({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.statLine}>
			<Text style={styles.statLabel}>{label}</Text>
			<Text style={styles.statValue}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.radii.lg,
		padding: theme.spacing.md,
		marginVertical: theme.spacing.sm,
		borderWidth: 1,
		borderColor: theme.colors.border,
		...theme.shadows.soft,
	},
	surface: {
		backgroundColor: theme.colors.surfaceAlt,
		borderRadius: theme.radii.lg,
		padding: theme.spacing.md,
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	buttonBase: {
		minHeight: 52,
		borderRadius: theme.radii.md,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: theme.spacing.md,
		marginVertical: theme.spacing.xs,
	},
	buttonTextBase: { fontWeight: '800', fontSize: 15 },
	buttonDisabled: { opacity: 0.55 },
	buttonTextDisabled: { opacity: 0.9 },
	label: { color: theme.colors.text, fontSize: 13, fontWeight: '700', marginBottom: theme.spacing.xs },
	inputShell: {
		minHeight: 52,
		borderRadius: theme.radii.md,
		borderWidth: 1,
		borderColor: theme.colors.border,
		backgroundColor: theme.colors.surface,
		flexDirection: 'row',
		alignItems: 'center',
		overflow: 'hidden',
	},
	input: {
		flex: 1,
		minHeight: 52,
		paddingHorizontal: theme.spacing.md,
		color: theme.colors.text,
	},
	multiline: {
		minHeight: 92,
		textAlignVertical: 'top',
		paddingTop: theme.spacing.md,
	},
	inputAddon: { paddingHorizontal: theme.spacing.md },
	helper: { marginTop: 6, color: theme.colors.mutedSoft, fontSize: 12 },
	pill: {
		alignSelf: 'flex-start',
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: 5,
		borderRadius: theme.radii.pill,
		borderWidth: 1,
	},
	pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
	metricCard: {
		flex: 1,
		borderRadius: theme.radii.lg,
		padding: theme.spacing.md,
		minHeight: 110,
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	metricLabel: { fontSize: 12, color: theme.colors.muted, fontWeight: '700' },
	metricValue: { marginTop: 8, fontSize: 24, fontWeight: '900', color: theme.colors.text },
	metricHelper: { marginTop: 4, fontSize: 12, color: theme.colors.muted },
	sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.md, marginBottom: theme.spacing.xs },
	sectionTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text },
	sectionAction: { fontSize: 13, color: theme.colors.primary, fontWeight: '800' },
	divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.md },
	avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
	avatarText: { color: theme.colors.white, fontWeight: '900' },
	banner: { borderRadius: theme.radii.md, padding: theme.spacing.md, borderWidth: 1 },
	bannerTitle: { fontWeight: '900', fontSize: 14, marginBottom: 4 },
	bannerMessage: { fontSize: 13, lineHeight: 19, color: theme.colors.muted },
	statLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm },
	statLabel: { fontSize: 13, color: theme.colors.muted, fontWeight: '600' },
	statValue: { fontSize: 13, color: theme.colors.text, fontWeight: '800' },
});

const buttonStyles: Record<ButtonVariant, ViewStyle> = {
	primary: { backgroundColor: theme.colors.primary },
	secondary: { backgroundColor: theme.colors.secondary },
	outline: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
	ghost: { backgroundColor: 'transparent' },
	danger: { backgroundColor: theme.colors.danger },
};

const buttonTextStyles: Record<ButtonVariant, TextStyle> = {
	primary: { color: theme.colors.white },
	secondary: { color: theme.colors.white },
	outline: { color: theme.colors.text },
	ghost: { color: theme.colors.primary },
	danger: { color: theme.colors.white },
};

const pillStyles: Record<NonNullable<PillProps['tone']>, ViewStyle> = {
	primary: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
	secondary: { backgroundColor: '#ECF3F8', borderColor: theme.colors.secondary },
	accent: { backgroundColor: '#F7EDE8', borderColor: theme.colors.accent },
	success: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.success },
	warning: { backgroundColor: '#FFF4E6', borderColor: theme.colors.warning },
	danger: { backgroundColor: '#FDECEC', borderColor: theme.colors.danger },
};

const pillTextStyles: Record<NonNullable<PillProps['tone']>, TextStyle> = {
	primary: { color: theme.colors.primary },
	secondary: { color: theme.colors.secondary },
	accent: { color: theme.colors.accent },
	success: { color: theme.colors.success },
	warning: { color: theme.colors.warning },
	danger: { color: theme.colors.danger },
};

const toneStyles: Record<NonNullable<MetricCardProps['tone']>, ViewStyle> = {
	primary: { backgroundColor: theme.colors.surface },
	secondary: { backgroundColor: '#F3F8FB' },
	accent: { backgroundColor: '#F9F2EF' },
	success: { backgroundColor: '#EEF8F2' },
};

const avatarStyles: Record<NonNullable<Parameters<typeof AvatarBadge>[0]['tone']>, ViewStyle> = {
	primary: { backgroundColor: theme.colors.primary },
	secondary: { backgroundColor: theme.colors.secondary },
	accent: { backgroundColor: theme.colors.accent },
};

const bannerStyles: Record<NonNullable<Parameters<typeof InfoBanner>[0]['tone']>, ViewStyle> = {
	primary: { backgroundColor: '#EEF7F1', borderColor: '#CFE7D7' },
	warning: { backgroundColor: '#FFF8E8', borderColor: '#F3D7A8' },
	accent: { backgroundColor: '#F8EFEC', borderColor: '#E6C5B8' },
};
