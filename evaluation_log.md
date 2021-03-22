# evaluation log

the purpose of this log is to do a microautoethnography of my efforts to
implement the six test machines.

## hot wire cutter

i thought about its construction, it seems that there are four actual stages
in a reference illustration that i have. i decided to have one redundant
linear block for the lower stages, and two separate linear blocks for each
upright stage.

the problem with this is that i have no idea how to handle the wire right now,
since the kinematic graph now has a cycle. the wire is different than other
tools in that it is not a rigid non-rotating tool like every other tool so
far. ideally, we would also rotate the wire---or perhaps we just remove a
degree of freedom and just say that the upperstages must be parallel... in
that case, it's just a 2 DOF wire cutter. okay, let's clarify that.

also the work envelope... if we only can move in the x and z directions,
it doesn't make sense to say that the work envelope is a box in this case.
but then also, i need to make a vertical 2d work envelope agh.

okay i went ahead and edited work envelope instantiation to account for
this. now we can have rectangles of all orientations! #equality

**possible rules of thumb**

- the positions of the stages must not move in such a way that causes the
wire to snap, but i think this is avoided by making it a 2 DOF cutter and
making it composed of two redundant linear stages.

## wasp clay 3D printer

this is the 2040 model, and they have a data sheet from their website, yay.
the first thing i notice is that they specify the work envelope (in their
words, "building volume") with a height and diameter... so looks like it's
time to support cylindrical work envelopes. i knew doing delta bot kinematics
was going to be a bit of a challenge, even though we are now working at the
block level so we're punting a bunch of the actual forward and inverse
kinematics calculations. however, there several forms of delta bot kinematics,
even, one with revolute joints and one ... with different ones? i need to look
into the kind that the wasp printer has a bit more deeply.

i have to implement a new class to handle a non-moving platform. actually no,
i'll just have current platforms be allowed to be non-actuating.

**rules of thumb**

- not super innovative, but the way we do bounds checking for work envelopes
that are defined cylindrically is different than with cuboid work envelopes,
and bounds checking for work envelopes needs to be implemented as a rule
of thumb anyway. this makes me think, is the rule of thumb for work envelope
checking "polymorphic" over different types (shapes) of work envelopes?

